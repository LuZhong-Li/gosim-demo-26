import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import PullsTab from '../src/pages/PullsTab';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getPull: vi.fn(),
  getPullComments: vi.fn(),
  listPulls: vi.fn(),
  removePullReviewer: vi.fn(),
  requestPullReviewer: vi.fn(),
}));

const pull = {
  number: 5,
  title: 'Reviewer test',
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

describe('Pull request reviewer picker', () => {
  it('requests a reviewer immediately from the Search picker and removes by username', async () => {
    vi.mocked(api.listPulls).mockResolvedValue([pull]);
    vi.mocked(api.getPullComments).mockResolvedValue([]);
    vi.mocked(api.getPull).mockResolvedValue({
      pull,
      protection: { branch: 'main', requiredApprovals: 1, requiredChecks: ['test'] },
      approvals: 0,
    });
    vi.mocked(api.requestPullReviewer).mockResolvedValue([{ username: 'bob-reviewer' }]);
    vi.mocked(api.removePullReviewer).mockResolvedValue([]);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PullsTab owner="acme-demo" name="acme-docs" />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: /#5 Reviewer test/ }));
    await user.click(screen.getByRole('button', { name: 'Reviewers' }));

    const search = screen.getByRole('textbox', { name: 'Search' });
    await user.type(search, 'bob-reviewer');
    await user.click(screen.getByRole('button', { name: 'bob-reviewer' }));

    await waitFor(() =>
      expect(api.requestPullReviewer).toHaveBeenCalledWith('acme-demo', 'acme-docs', 5, 'bob-reviewer'),
    );
    expect(screen.getByRole('button', { name: 'Remove bob-reviewer' })).toBeInTheDocument();
  });
});
