import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import RepoPage from '../src/pages/RepoPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  createIssue: vi.fn(),
  getIssue: vi.fn(),
  getRepo: vi.fn(),
  getTree: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
  updateIssue: vi.fn(),
}));

const openIssue = {
  number: 1,
  title: 'Improve onboarding',
  body: 'Seed issue used by issue tests.',
  author: 'alice-dev',
  state: 'open',
  createdAt: '2026-01-01T00:00:00.000Z',
  labels: ['bug', 'documentation'],
  milestone: 'Q3 launch',
  assignees: ['bob-reviewer'],
  comments: [],
  reactions: [],
};

const closedIssue = {
  ...openIssue,
  number: 2,
  title: 'Legacy welcome text',
  state: 'closed',
  labels: ['bug'],
  milestone: null,
};

function mockIssuesApi(options: { canEdit: boolean; canClose: boolean }) {
  vi.mocked(api.getRepo).mockResolvedValue({
    repo: {
      owner: 'acme-demo',
      name: 'acme-docs',
      visibility: 'public',
      description: 'seed repository',
      defaultBranch: 'main',
    },
  });
  vi.mocked(api.listIssues).mockResolvedValue([openIssue, closedIssue]);
  vi.mocked(api.getTree).mockResolvedValue({
    branch: 'main',
    defaultBranch: 'main',
    files: [],
    branches: ['main'],
  });
  vi.mocked(api.getIssue).mockResolvedValue({
    ...openIssue,
    canEdit: options.canEdit,
    canClose: options.canClose,
    canTriage: options.canClose,
  });
}

function renderIssues(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/:owner/:name" element={<RepoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('repository issues workspace', () => {
  it('uses links for Open and Closed and filters the list by state', async () => {
    mockIssuesApi({ canEdit: true, canClose: true });
    const user = userEvent.setup();
    renderIssues('/acme-demo/acme-docs?tab=issues');

    expect(await screen.findByRole('link', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Closed' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Improve onboarding' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Legacy welcome text' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Closed' }));

    expect(await screen.findByRole('link', { name: 'Legacy welcome text' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Improve onboarding' })).not.toBeInTheDocument();
  });

  it('filters as the user types in Search issues', async () => {
    mockIssuesApi({ canEdit: true, canClose: true });
    const user = userEvent.setup();
    renderIssues('/acme-demo/acme-docs?tab=issues');

    const search = await screen.findByRole('searchbox', { name: 'Search issues' });
    await user.type(search, 'zzz');
    expect(await screen.findByText('No issues match this filter.')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'Improve');
    expect(await screen.findByRole('link', { name: 'Improve onboarding' })).toBeInTheDocument();
  });

  it('opens the creation form from the New issue link with the official labels', async () => {
    mockIssuesApi({ canEdit: true, canClose: true });
    const user = userEvent.setup();
    renderIssues('/acme-demo/acme-docs?tab=issues');

    await user.click(await screen.findByRole('link', { name: 'New issue' }));

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit new issue' }));
    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(api.createIssue).not.toHaveBeenCalled();
  });

  it('offers edit and status controls to a writer', async () => {
    mockIssuesApi({ canEdit: true, canClose: true });
    renderIssues('/acme-demo/acme-docs?tab=issues&issue=1');

    expect(await screen.findByRole('heading', { name: 'Improve onboarding' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit issue title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit issue description' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close issue' })).toBeInTheDocument();
  });

  it('hides edit and status controls from a read-only viewer', async () => {
    mockIssuesApi({ canEdit: false, canClose: false });
    renderIssues('/acme-demo/acme-docs?tab=issues&issue=1');

    await screen.findByRole('heading', { name: 'Improve onboarding' });
    expect(screen.queryByRole('button', { name: 'Edit issue title' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit issue description' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close issue' })).not.toBeInTheDocument();
  });

  it('assigns a milestone from the Milestone picker', async () => {
    mockIssuesApi({ canEdit: true, canClose: true });
    vi.mocked(api.listMilestones).mockResolvedValue(['Q3 launch', 'v1.0']);
    vi.mocked(api.updateIssue).mockResolvedValue(openIssue);
    const user = userEvent.setup();
    renderIssues('/acme-demo/acme-docs?tab=issues&issue=1');

    await screen.findByRole('heading', { name: 'Improve onboarding' });
    await user.click(await screen.findByRole('button', { name: 'Milestone' }));
    await user.click(screen.getByRole('option', { name: 'v1.0' }));

    await waitFor(() =>
      expect(api.updateIssue).toHaveBeenCalledWith('acme-demo', 'acme-docs', 1, {
        milestone: 'v1.0',
      }),
    );
  });
});
