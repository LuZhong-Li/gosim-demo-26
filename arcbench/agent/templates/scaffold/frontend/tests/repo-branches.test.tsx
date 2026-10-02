import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import RepoPage from '../src/pages/RepoPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  createBranch: vi.fn(),
  getFile: vi.fn(),
  getRepo: vi.fn(),
  getTree: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
}));

function mockBranchApi() {
  vi.mocked(api.getRepo).mockResolvedValue({
    repo: {
      owner: 'acme-demo',
      name: 'acme-docs',
      visibility: 'public',
      description: 'seed repository',
      defaultBranch: 'main',
      canWrite: true,
    },
  });
  vi.mocked(api.listIssues).mockResolvedValue([]);
  vi.mocked(api.listMilestones).mockResolvedValue([]);
  vi.mocked(api.getTree).mockImplementation(async (_owner, _name, branch) => ({
    branch: branch || 'main',
    defaultBranch: 'main',
    files:
      branch === 'feature-search'
        ? ['README.md', 'main-only.md', 'src/search.ts']
        : ['README.md', 'src/search.ts'],
    branches: ['main', 'feature-search'],
  }));
}

function renderRepo(url = '/acme-demo/acme-docs?tab=code') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/:owner/:name" element={<RepoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('repository branch selector', () => {
  it('opens from the unique Branch button and lists the branch names', async () => {
    mockBranchApi();
    const user = userEvent.setup();
    renderRepo();

    await user.click(await screen.findByRole('button', { name: 'Branch main' }));

    expect(screen.getByRole('textbox', { name: 'Find branch' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'main' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'feature-search' })).toBeInTheDocument();
  });

  it('switches branch and shows the branch-only file', async () => {
    mockBranchApi();
    const user = userEvent.setup();
    renderRepo();

    await user.click(await screen.findByRole('button', { name: 'Branch main' }));
    await user.click(screen.getByRole('option', { name: 'feature-search' }));

    await waitFor(() => expect(api.getTree).toHaveBeenCalledWith('acme-demo', 'acme-docs', 'feature-search'));
    expect(await screen.findByRole('link', { name: 'main-only.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Branch feature-search' })).toBeInTheDocument();
  });

  it('offers Create branch for a valid unused name and rejects an invalid one', async () => {
    mockBranchApi();
    const user = userEvent.setup();
    renderRepo();

    await user.click(await screen.findByRole('button', { name: 'Branch main' }));
    const find = screen.getByRole('textbox', { name: 'Find branch' });

    await user.type(find, 'pw-branch-1');
    expect(screen.getByRole('option', { name: 'Create branch: pw-branch-1' })).toBeInTheDocument();

    await user.clear(find);
    await user.type(find, 'invalid..branch');
    expect(screen.getByText('Invalid branch')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Create branch:/ })).not.toBeInTheDocument();
  });

  it('shows No matching branch to a reader who cannot create branches', async () => {
    mockBranchApi();
    vi.mocked(api.getRepo).mockResolvedValue({
      repo: {
        owner: 'acme-demo',
        name: 'acme-docs',
        visibility: 'public',
        description: 'seed repository',
        defaultBranch: 'main',
        canWrite: false,
      },
    });
    const user = userEvent.setup();
    renderRepo();

    await user.click(await screen.findByRole('button', { name: 'Branch main' }));
    const find = screen.getByRole('textbox', { name: 'Find branch' });
    await user.type(find, 'zzz');

    expect(screen.getByText('No matching branch')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Create branch:/ })).not.toBeInTheDocument();
  });
});
