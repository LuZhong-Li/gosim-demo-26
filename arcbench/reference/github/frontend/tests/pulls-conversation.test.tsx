import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import PullsTab from '../src/pages/PullsTab';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  addPullConversationComment: vi.fn(),
  getPull: vi.fn(),
  getPullComments: vi.fn(),
  getPullFiles: vi.fn(),
  getTree: vi.fn(),
  listPulls: vi.fn(),
  listPullCommits: vi.fn(),
}));

const basePull = {
  number: 1,
  title: 'Improve onboarding',
  body: 'Improve the onboarding flow for new contributors.',
  author: 'alice-dev',
  state: 'open',
  baseBranch: 'main',
  headBranch: 'feature-search',
  createdAt: '2026-01-01T00:00:00.000Z',
  reviews: [],
  checks: [{ name: 'test', state: 'success' }],
  reviewers: [],
  milestone: null,
};

function mockPull(overrides = {}) {
  vi.mocked(api.listPulls).mockResolvedValue([basePull]);
  vi.mocked(api.getPullComments).mockResolvedValue([]);
  vi.mocked(api.listPullCommits).mockResolvedValue({
    baseBranch: 'main',
    headBranch: 'feature-search',
    commits: [],
    stats: { changedFiles: 0, added: 0, removed: 0 },
  });
  vi.mocked(api.getPull).mockResolvedValue({
    pull: basePull,
    protection: { branch: 'main', requiredApprovals: 1, requiredChecks: ['test'] },
    approvals: 1,
    canMerge: true,
    ...overrides,
  });
}

function renderPulls() {
  render(
    <MemoryRouter initialEntries={['/acme-demo/acme-docs?tab=pulls&pull=1']}>
      <PullsTab owner="acme-demo" name="acme-docs" initialPullNumber={1} />
    </MemoryRouter>,
  );
}

describe('pull request conversation and merge state', () => {
  it('posts an ordinary conversation comment and shows the timeline', async () => {
    mockPull({
      pull: {
        ...basePull,
        comments: [{ id: 'pc1', author: 'bob-reviewer', body: 'Earlier note' }],
        activities: [
          { type: 'Opened this pull request', actor: 'alice-dev', at: '2026-01-01T00:00:00.000Z' },
        ],
      },
    });
    const user = userEvent.setup();
    renderPulls();

    expect(await screen.findByText('Earlier note')).toBeInTheDocument();
    expect(screen.getByText('Opened this pull request')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Comment'), 'Looks good to me');
    await user.click(screen.getByRole('button', { name: 'Comment' }));

    await waitFor(() =>
      expect(api.addPullConversationComment).toHaveBeenCalledWith(
        'acme-demo',
        'acme-docs',
        1,
        'Looks good to me',
      ),
    );
  });

  it('disables the merge entry when the branches conflict', async () => {
    mockPull({ conflicts: ['src/search.ts'] });
    renderPulls();

    expect(
      await screen.findByText(/These branches have conflicting changes/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge pull request' })).toBeDisabled();
  });
});
