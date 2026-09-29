import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import PullsTab from '../src/pages/PullsTab';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  compareBranches: vi.fn(),
  getPull: vi.fn(),
  getPullComments: vi.fn(),
  getPullFiles: vi.fn(),
  getTree: vi.fn(),
  listPulls: vi.fn(),
  listPullCommits: vi.fn(),
}));

const pull = {
  number: 2,
  title: 'Fix search',
  body: 'Search fixes',
  author: 'alice-dev',
  state: 'open',
  baseBranch: 'main',
  headBranch: 'feature-search',
  createdAt: '2026-01-01T00:00:00.000Z',
  reviews: [],
  checks: [],
  reviewers: [],
  milestone: null,
};

function mockPullsApi(approvals: number) {
  vi.mocked(api.listPulls).mockResolvedValue([pull]);
  vi.mocked(api.getTree).mockResolvedValue({
    branches: ['main', 'feature-search'],
    files: [],
  });
  vi.mocked(api.getPullComments).mockResolvedValue([]);
  vi.mocked(api.getPullFiles).mockResolvedValue({
    baseBranch: 'main',
    headBranch: 'feature-search',
    files: [],
    stats: { changedFiles: 0, added: 0, removed: 0 },
  });
  vi.mocked(api.listPullCommits).mockResolvedValue({
    baseBranch: 'main',
    headBranch: 'feature-search',
    commits: [],
    stats: { changedFiles: 0, added: 0, removed: 0 },
  });
  vi.mocked(api.getPull).mockResolvedValue({
    pull,
    protection: { branch: 'main', requiredApprovals: 1, requiredChecks: ['test'] },
    approvals,
    canMerge: true,
  });
}

describe('PullsTab merge and comparison states', () => {
  it('disables merge and explains branch protection when approval is missing', async () => {
    mockPullsApi(0);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PullsTab owner="acme-demo" name="acme-docs" />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('link', { name: 'Fix search' }));

    expect(await screen.findByText('Review required by branch protection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge pull request' })).toBeDisabled();
  });

});
