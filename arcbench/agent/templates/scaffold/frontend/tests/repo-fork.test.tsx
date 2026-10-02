import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import RepoPage from '../src/pages/RepoPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  forkRepo: vi.fn(),
  getRepo: vi.fn(),
  getRepoAccess: vi.fn(),
  getTree: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
  listOrgs: vi.fn(),
  me: vi.fn(),
}));

function mockRepo(extra: { forkedFrom?: string | null } = {}) {
  vi.mocked(api.getRepo).mockResolvedValue({
    repo: {
      owner: 'acme-demo',
      name: 'acme-docs',
      visibility: 'public',
      description: 'seed repository',
      defaultBranch: 'main',
      forkedFrom: extra.forkedFrom ?? null,
    },
  });
  vi.mocked(api.listIssues).mockResolvedValue([]);
  vi.mocked(api.getTree).mockResolvedValue({
    branch: 'main',
    defaultBranch: 'main',
    files: [],
    branches: ['main'],
  });
  vi.mocked(api.getRepoAccess).mockResolvedValue({
    canManage: false,
    grants: [],
    members: [],
    teams: [],
  });
  vi.mocked(api.listMilestones).mockResolvedValue([]);
  vi.mocked(api.listOrgs).mockResolvedValue([
    { name: 'acme-demo', displayName: 'Acme Demo', role: 'Owner' },
  ]);
  vi.mocked(api.me).mockResolvedValue({
    username: 'alice-dev',
    email: 'alice.dev@example.test',
    emailVerified: true,
  });
}

function renderRepo(url = '/acme-demo/acme-docs') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/:owner/:name" element={<RepoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('forking a repository', () => {
  it('opens a form from the Fork button and creates the fork in the default namespace', async () => {
    mockRepo();
    vi.mocked(api.forkRepo).mockResolvedValue({
      owner: 'alice-dev',
      name: 'acme-docs',
      visibility: 'public',
      description: '',
    });
    const user = userEvent.setup();
    renderRepo();

    await user.click(await screen.findByRole('button', { name: 'Fork' }));

    expect(await screen.findByLabelText('Repository name')).toHaveValue('acme-docs');
    expect(screen.getByLabelText('Owner')).toHaveValue('alice-dev');
    await user.click(screen.getByRole('button', { name: 'Create fork' }));

    await waitFor(() =>
      expect(api.forkRepo).toHaveBeenCalledWith('acme-demo', 'acme-docs', {
        name: 'acme-docs',
        targetOwner: 'alice-dev',
        visibility: 'public',
      }),
    );
  });

  it('shows where the repository was forked from', async () => {
    mockRepo({ forkedFrom: 'acme-demo/acme-docs' });
    renderRepo('/alice-dev/acme-docs');

    expect(await screen.findByText(/Forked from/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'acme-demo/acme-docs' })).toBeInTheDocument();
  });
});
