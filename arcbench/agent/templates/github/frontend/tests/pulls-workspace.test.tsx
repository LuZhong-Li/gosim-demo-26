import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import PullsTab from '../src/pages/PullsTab';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getPull: vi.fn(),
  getPullComments: vi.fn(),
  getPullFiles: vi.fn(),
  getTree: vi.fn(),
  listPulls: vi.fn(),
  listPullCommits: vi.fn(),
}));

const pull = {
  number: 1,
  title: 'Improve onboarding',
  body: 'Improve the onboarding flow for new contributors.',
  author: 'alice-dev',
  state: 'open',
  baseBranch: 'main',
  headBranch: 'feature-search',
  createdAt: '2026-01-01T00:00:00.000Z',
  reviews: [],
  checks: [{ name: 'test', state: 'pending' }],
  reviewers: [],
  milestone: null,
};

function mockWorkspace() {
  vi.mocked(api.listPulls).mockResolvedValue([pull]);
  vi.mocked(api.getPullComments).mockResolvedValue([
    { id: 'c1', author: 'bob-reviewer', body: 'Confirmed.' },
  ]);
  vi.mocked(api.getPull).mockResolvedValue({
    pull,
    protection: { branch: 'main', requiredApprovals: 1, requiredChecks: ['test'] },
    approvals: 0,
  });
  vi.mocked(api.getPullFiles).mockResolvedValue({
    baseBranch: 'main',
    headBranch: 'feature-search',
    files: [
      { path: 'src/search.ts', status: 'modified', lines: [{ type: 'added', text: 'const q' }] },
    ],
    stats: { changedFiles: 2, added: 3, removed: 1 },
  });
  vi.mocked(api.listPullCommits).mockResolvedValue({
    baseBranch: 'main',
    headBranch: 'feature-search',
    commits: [
      {
        sha: 'abcdef1234567890',
        message: 'Refine search and add utilities',
        author: 'alice-dev',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    ],
    stats: { changedFiles: 2, added: 3, removed: 1 },
  });
}

function renderWorkspace(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <PullsTab owner="acme-demo" name="acme-docs" />
    </MemoryRouter>,
  );
}

describe('pull request review workspace', () => {
  it('opens the PR from the URL, shows the exact title and offers the three view links', async () => {
    mockWorkspace();
    renderWorkspace('/acme-demo/acme-docs?tab=pulls&pull=1');

    expect(await screen.findByRole('heading', { name: 'Improve onboarding' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Commits' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Files changed' })).toBeInTheDocument();
    expect(screen.getByText('Improve the onboarding flow for new contributors.')).toBeInTheDocument();
  });

  it('shows aggregate diff statistics in the official additions/deletions format', async () => {
    mockWorkspace();
    const user = userEvent.setup();
    renderWorkspace('/acme-demo/acme-docs?tab=pulls&pull=1');

    await user.click(await screen.findByRole('link', { name: 'Files changed' }));

    expect(await screen.findByText('3 additions, 1 deletions')).toBeInTheDocument();
    expect(screen.getByText('Changed files (2)')).toBeInTheDocument();
    expect(screen.getByText('src/search.ts')).toBeInTheDocument();
  });

  it('shows the comparable commits in the Commits view', async () => {
    mockWorkspace();
    const user = userEvent.setup();
    renderWorkspace('/acme-demo/acme-docs?tab=pulls&pull=1');

    await user.click(await screen.findByRole('link', { name: 'Commits' }));

    expect(await screen.findByText('Commit summary')).toBeInTheDocument();
    expect(screen.getByText('Refine search and add utilities')).toBeInTheDocument();
  });
});
