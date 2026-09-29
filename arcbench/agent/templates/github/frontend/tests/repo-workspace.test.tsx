import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import RepoPage from '../src/pages/RepoPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  createFile: vi.fn(),
  getRepo: vi.fn(),
  getTree: vi.fn(),
  listIssues: vi.fn(),
}));

function mockRepoApi() {
  vi.mocked(api.getRepo).mockResolvedValue({
    repo: {
      owner: 'acme-demo',
      name: 'acme-docs',
      visibility: 'public',
      description: 'seed repository',
      defaultBranch: 'main',
      cloneUrl: 'https://arc-bench.local/acme-demo/acme-docs.git',
    },
  });
  vi.mocked(api.listIssues).mockResolvedValue([]);
  vi.mocked(api.getTree).mockResolvedValue({
    branch: 'main',
    defaultBranch: 'main',
    files: ['README.md'],
    branches: ['main', 'release'],
  });
}

function renderRepo() {
  render(
    <MemoryRouter initialEntries={['/acme-demo/acme-docs?tab=code']}>
      <Routes>
        <Route path="/:owner/:name" element={<RepoPage />} />
        <Route path="/:owner/:name/search" element={<p>search page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('repository workspace controls', () => {
  it('uses navigation links for Code / Issues / Pull requests', async () => {
    mockRepoApi();
    renderRepo();

    expect(await screen.findByRole('link', { name: 'Code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Issues/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pull requests' })).toBeInTheDocument();
  });

  it('opens the clone popover from the Code button and reports Copied', async () => {
    mockRepoApi();
    const user = userEvent.setup();
    renderRepo();

    await user.click(await screen.findByRole('button', { name: 'Code' }));

    expect(screen.getByRole('dialog', { name: 'Clone' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'HTTPS' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'SSH' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy clone value' }));
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('exposes Add file -> Create new file with the official field labels', async () => {
    mockRepoApi();
    const user = userEvent.setup();
    renderRepo();

    await user.click(await screen.findByRole('button', { name: 'Add file' }));
    await user.click(screen.getByRole('menuitem', { name: 'Create new file' }));

    expect(screen.getByLabelText('File name')).toBeInTheDocument();
    expect(screen.getByLabelText('File contents')).toBeInTheDocument();
    expect(screen.getByLabelText('Commit message')).toBeInTheDocument();

    // An empty commit message is rejected with the official message.
    await user.type(screen.getByLabelText('File name'), 'docs/guide.md');
    await user.click(screen.getByRole('button', { name: 'Commit changes' }));
    expect(await screen.findByText('Commit message is required')).toBeInTheDocument();
    expect(api.createFile).not.toHaveBeenCalled();

    // An invalid path is rejected as well.
    await user.clear(screen.getByLabelText('File name'));
    await user.type(screen.getByLabelText('File name'), '../secret.md');
    await user.type(screen.getByLabelText('Commit message'), 'Add guide');
    await user.click(screen.getByRole('button', { name: 'Commit changes' }));
    expect(await screen.findByText('Invalid file path')).toBeInTheDocument();
  });

  it('submits the top search box to the code search page', async () => {
    mockRepoApi();
    const user = userEvent.setup();
    renderRepo();

    const search = await screen.findByRole('searchbox', { name: 'Search' });
    await user.type(search, 'search{Enter}');

    expect(await screen.findByText('search page')).toBeInTheDocument();
  });
});
