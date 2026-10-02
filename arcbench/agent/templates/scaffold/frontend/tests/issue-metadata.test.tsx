import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import RepoPage from '../src/pages/RepoPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getIssue: vi.fn(),
  getRepo: vi.fn(),
  getTree: vi.fn(),
  listIssues: vi.fn(),
  listLabels: vi.fn(),
  listMilestones: vi.fn(),
  listRepoMembers: vi.fn(),
  updateIssue: vi.fn(),
}));

const seededIssue = {
  number: 1,
  title: 'Improve onboarding',
  body: 'Seed issue used by issue tests.',
  author: 'alice-dev',
  state: 'open',
  createdAt: '2026-01-01T00:00:00.000Z',
  labels: [],
  milestone: null,
  assignees: ['bob-reviewer'],
  comments: [],
  reactions: [],
  activities: [
    { type: 'Created issue', actor: 'alice-dev', at: '2026-01-01T00:00:00.000Z' },
    {
      type: 'Commented',
      actor: 'bob-reviewer',
      at: '2026-01-02T00:00:00.000Z',
      body: 'Confirmed.',
    },
  ],
  updatedAt: '2026-09-29T12:00:00.000Z',
};

function mockApi() {
  vi.mocked(api.getRepo).mockResolvedValue({
    repo: {
      owner: 'acme-demo',
      name: 'acme-docs',
      visibility: 'public',
      description: 'seed repository',
      defaultBranch: 'main',
    },
  });
  vi.mocked(api.listIssues).mockResolvedValue([seededIssue]);
  vi.mocked(api.getTree).mockResolvedValue({
    branch: 'main',
    defaultBranch: 'main',
    files: [],
    branches: ['main'],
  });
  vi.mocked(api.listMilestones).mockResolvedValue(['Q3 launch', 'v1.0']);
  vi.mocked(api.listLabels).mockResolvedValue(['bug', 'documentation']);
  vi.mocked(api.listRepoMembers).mockResolvedValue(['alice-dev', 'bob-reviewer']);
  vi.mocked(api.getIssue).mockResolvedValue({
    ...seededIssue,
    canEdit: true,
    canClose: true,
    canTriage: true,
  });
  vi.mocked(api.updateIssue).mockResolvedValue(seededIssue);
}

function renderIssue() {
  render(
    <MemoryRouter initialEntries={['/acme-demo/acme-docs?tab=issues&issue=1']}>
      <Routes>
        <Route path="/:owner/:name" element={<RepoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('issue metadata editors', () => {
  it('changes assignees from the detail sidebar', async () => {
    mockApi();
    const user = userEvent.setup();
    renderIssue();

    const gear = await screen.findByRole('button', { name: 'Assignees' });
    await user.click(gear);

    const search = screen.getByLabelText('Search assignees');
    await user.type(search, 'alice');
    await user.click(screen.getByRole('checkbox', { name: 'alice-dev' }));

    await waitFor(() =>
      expect(api.updateIssue).toHaveBeenCalledWith('acme-demo', 'acme-docs', 1, {
        assignees: ['bob-reviewer', 'alice-dev'],
      }),
    );
  });

  it('changes labels from the detail sidebar using the repository catalog', async () => {
    mockApi();
    const user = userEvent.setup();
    renderIssue();

    const gear = await screen.findByRole('button', { name: 'Labels' });
    await user.click(gear);
    await user.click(screen.getByRole('checkbox', { name: 'bug' }));

    await waitFor(() =>
      expect(api.updateIssue).toHaveBeenCalledWith('acme-demo', 'acme-docs', 1, {
        labels: ['bug'],
      }),
    );
  });

  it('renders comment activities with their body in the timeline', async () => {
    mockApi();
    renderIssue();

    const activity = await screen.findByText('Activity');
    const list = activity.parentElement as HTMLElement;
    expect(within(list).getByText('Commented')).toBeInTheDocument();
    expect(within(list).getByText('Confirmed.')).toBeInTheDocument();
  });
});
