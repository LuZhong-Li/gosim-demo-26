import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import OrgPage from '../src/pages/OrgPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getOrg: vi.fn(),
  removeOrgMember: vi.fn(),
}));

function mockOrg(role: string) {
  vi.mocked(api.getOrg).mockResolvedValue({
    org: { name: 'acme-demo', displayName: 'Acme Demo' },
    role,
    repos: [],
    members: [
      { username: 'alice-dev', role: 'Owner' },
      { username: 'bob-reviewer', role: 'Member' },
    ],
    teams: [],
  });
}

function renderOrg() {
  render(
    <MemoryRouter initialEntries={['/orgs/acme-demo']}>
      <Routes>
        <Route path="/orgs/:name" element={<OrgPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('organization people list', () => {
  it('removes a member through the Member menu for an owner', async () => {
    mockOrg('Owner');
    vi.mocked(api.removeOrgMember).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderOrg();

    await user.click(await screen.findByRole('button', { name: 'Member menu bob-reviewer' }));
    expect(screen.queryByRole('menuitem', { name: 'Remove from organization' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Remove from organization' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(api.removeOrgMember).toHaveBeenCalledWith('acme-demo', 'bob-reviewer'));
  });

  it('shows no member menu to a non-owner', async () => {
    mockOrg('Member');
    renderOrg();

    // REQ-2-1: the overview heading is the organization name (the identifier);
    // the display name is shown separately.
    await screen.findByRole('heading', { name: 'acme-demo' });
    expect(screen.queryByRole('button', { name: 'Member menu bob-reviewer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Remove from organization' })).not.toBeInTheDocument();
  });
});
