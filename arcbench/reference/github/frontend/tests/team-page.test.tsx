import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import TeamPage from '../src/pages/TeamPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  addTeamMember: vi.fn(),
  getTeam: vi.fn(),
  removeTeamMember: vi.fn(),
  setTeamParent: vi.fn(),
}));

function mockTeam(options: { role?: string; members?: string[] } = {}) {
  vi.mocked(api.getTeam).mockResolvedValue({
    org: { name: 'acme-demo', displayName: 'Acme Demo' },
    team: {
      name: 'mobile-team',
      description: '',
      parent: null,
      members: options.members || [],
    },
    teams: ['mobile-team', 'frontend-team'],
    role: options.role === undefined ? 'Owner' : options.role,
  });
}

function renderTeam(url = '/orgs/acme-demo/teams/mobile-team') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/orgs/:name/teams/:team" element={<TeamPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('organization team page', () => {
  it('is titled organization/team and offers Members and Settings links', async () => {
    mockTeam();
    renderTeam();

    expect(await screen.findByRole('heading', { name: 'acme-demo/mobile-team' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('adds a member from the Add member form and removes it inline', async () => {
    mockTeam({ members: ['bob-reviewer'] });
    vi.mocked(api.addTeamMember).mockResolvedValue({
      name: 'mobile-team',
      description: '',
      parent: null,
      members: ['bob-reviewer', 'carol-reader'],
    });
    vi.mocked(api.removeTeamMember).mockResolvedValue({
      name: 'mobile-team',
      description: '',
      parent: null,
      members: [],
    });
    const user = userEvent.setup();
    renderTeam();

    expect(await screen.findByRole('button', { name: 'Remove bob-reviewer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add member' }));
    await user.type(screen.getByLabelText('Username'), 'carol-reader');
    await user.click(screen.getByRole('button', { name: 'Add member' }));

    await waitFor(() =>
      expect(api.addTeamMember).toHaveBeenCalledWith('acme-demo', 'mobile-team', 'carol-reader'),
    );
  });

  it('saves a parent team from Settings', async () => {
    mockTeam();
    vi.mocked(api.setTeamParent).mockResolvedValue({
      name: 'mobile-team',
      description: '',
      parent: 'frontend-team',
      members: [],
    });
    const user = userEvent.setup();
    renderTeam('/orgs/acme-demo/teams/mobile-team?tab=settings');

    const select = await screen.findByRole('combobox', { name: 'Parent team' });
    await user.selectOptions(select, 'frontend-team');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.setTeamParent).toHaveBeenCalledWith('acme-demo', 'mobile-team', 'frontend-team'),
    );
  });

  it('hides the management controls from a non-owner', async () => {
    mockTeam({ role: 'Member' });
    renderTeam();

    await screen.findByRole('heading', { name: 'acme-demo/mobile-team' });
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });
});
