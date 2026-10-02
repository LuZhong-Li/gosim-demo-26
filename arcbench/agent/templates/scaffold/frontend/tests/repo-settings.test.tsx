import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import RepoSettingsPage from '../src/pages/RepoSettingsPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getRepo: vi.fn(),
  getTree: vi.fn(),
  getRepoAccess: vi.fn(),
  setRepoAccess: vi.fn(),
}));

function mockSettings(canAdmin: boolean) {
  vi.mocked(api.getRepo).mockResolvedValue({
    repo: {
      owner: 'acme-demo',
      name: 'acme-docs',
      visibility: 'public',
      description: 'seed repository',
      defaultBranch: 'main',
      canAdmin,
      protection: { branch: 'main', requiredApprovals: 1, requiredChecks: ['test'] },
    },
  });
  vi.mocked(api.getTree).mockResolvedValue({
    branch: 'main',
    defaultBranch: 'main',
    files: [],
    branches: ['main', 'release'],
  });
  vi.mocked(api.getRepoAccess).mockResolvedValue({
    canManage: canAdmin,
    grants: [{ subject: 'frontend-team', kind: 'team', permission: 'Write' }],
    members: ['alice-dev', 'bob-reviewer'],
    teams: ['frontend-team'],
  });
}

function renderAccess() {
  render(
    <MemoryRouter initialEntries={['/acme-demo/acme-docs/settings/access']}>
      <Routes>
        <Route
          path="/:owner/:name/settings/access"
          element={<RepoSettingsPage section="access" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderSettings(section: 'general' | 'branches') {
  render(
    <MemoryRouter initialEntries={[`/acme-demo/acme-docs/settings/${section}`]}>
      <Routes>
        <Route
          path="/:owner/:name/settings/general"
          element={<RepoSettingsPage section="general" />}
        />
        <Route
          path="/:owner/:name/settings/branches"
          element={<RepoSettingsPage section="branches" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('repository settings surface', () => {
  it('offers an admin the Change visibility confirmation flow', async () => {
    mockSettings(true);
    const user = userEvent.setup();
    renderSettings('general');

    await user.click(await screen.findByRole('button', { name: 'Change visibility' }));

    expect(screen.getByRole('dialog', { name: 'Change visibility' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Public' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm visibility' })).toBeInTheDocument();
  });

  it('hides the visibility action from a non-admin collaborator', async () => {
    mockSettings(false);
    renderSettings('general');

    await screen.findByRole('heading', { name: /acme-demo\/acme-docs settings/ });
    expect(screen.queryByRole('button', { name: 'Change visibility' })).not.toBeInTheDocument();
  });

  it('renders the Default branch combobox and the protection summary for an admin', async () => {
    mockSettings(true);
    renderSettings('branches');

    expect(await screen.findByRole('combobox', { name: 'Default branch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(screen.getByText('main', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 approval')).toBeInTheDocument();
    expect(screen.getByText('Require status check test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add branch protection rule' })).toBeInTheDocument();
  });

  it('hides the default-branch editor from a non-admin collaborator', async () => {
    mockSettings(false);
    renderSettings('branches');

    await screen.findByRole('heading', { name: /acme-demo\/acme-docs settings/ });
    expect(screen.queryByRole('combobox', { name: 'Default branch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add branch protection rule' })).not.toBeInTheDocument();
  });
});

describe('repository manage access', () => {
  it('grants a team from the Add people or teams picker', async () => {
    mockSettings(true);
    vi.mocked(api.setRepoAccess).mockResolvedValue({
      subject: 'frontend-team',
      kind: 'team',
      permission: 'Write',
    });
    const user = userEvent.setup();
    renderAccess();

    await user.click(await screen.findByRole('button', { name: 'Add people or teams' }));
    // While the picker is active the opening button is hidden.
    expect(screen.queryByRole('button', { name: 'Add people or teams' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Search'), 'front');
    await user.click(screen.getByRole('option', { name: 'frontend-team' }));
    await user.selectOptions(screen.getByLabelText('Role'), 'Write');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(api.setRepoAccess).toHaveBeenCalledWith('acme-demo', 'acme-docs', {
        subject: 'frontend-team',
        kind: 'team',
        permission: 'Write',
      }),
    );
  });

  it('lists an existing grant as a row with a Role select and Save', async () => {
    mockSettings(true);
    vi.mocked(api.setRepoAccess).mockResolvedValue({
      subject: 'frontend-team',
      kind: 'team',
      permission: 'Read',
    });
    const user = userEvent.setup();
    renderAccess();

    const row = await screen.findByRole('listitem', { name: 'frontend-team' });
    await user.selectOptions(within(row).getByRole('combobox', { name: 'Role' }), 'Read');
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.setRepoAccess).toHaveBeenCalledWith('acme-demo', 'acme-docs', {
        subject: 'frontend-team',
        kind: 'team',
        permission: 'Read',
      }),
    );
  });

  it('hides the access picker from a non-admin', async () => {
    mockSettings(false);
    renderAccess();

    await screen.findByRole('heading', { name: /acme-demo\/acme-docs settings/ });
    expect(screen.queryByRole('button', { name: 'Add people or teams' })).not.toBeInTheDocument();
  });
});
