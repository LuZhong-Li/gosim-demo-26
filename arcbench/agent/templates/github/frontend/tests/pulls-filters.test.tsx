import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import PullsTab from '../src/pages/PullsTab';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getPull: vi.fn(),
  getPullComments: vi.fn(),
  getPullFiles: vi.fn(),
  getTree: vi.fn(),
  listMilestones: vi.fn(),
  listPulls: vi.fn(),
  listPullCommits: vi.fn(),
}));

const openPull = {
  number: 1,
  title: 'Improve onboarding',
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

const closedPull = {
  ...openPull,
  number: 4,
  title: 'Retire legacy banner',
  author: 'bob-reviewer',
  state: 'closed',
};

const draftPull = { ...openPull, number: 3, title: 'Draft onboarding update', state: 'draft' };

function mockFilters() {
  vi.mocked(api.listPulls).mockResolvedValue([openPull, closedPull, draftPull]);
  vi.mocked(api.listMilestones).mockResolvedValue([]);
}

function renderList(url = '/acme-demo/acme-docs?tab=pulls') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/:owner/:name" element={<PullsTab owner="acme-demo" name="acme-docs" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('pull request list filters', () => {
  it('offers status links and filters the list by status', async () => {
    mockFilters();
    const user = userEvent.setup();
    renderList();

    expect(await screen.findByRole('link', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Closed' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Merged' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Closed' }));

    expect(await screen.findByRole('link', { name: 'Retire legacy banner' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Improve onboarding' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Draft onboarding update' })).not.toBeInTheDocument();
  });

  it('filters by author', async () => {
    mockFilters();
    const user = userEvent.setup();
    renderList();

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Author' }), 'bob-reviewer');

    expect(await screen.findByRole('link', { name: 'Retire legacy banner' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Improve onboarding' })).not.toBeInTheDocument();
  });

  it('keeps the chosen status filter in the URL so a reload shows the same rows', async () => {
    mockFilters();
    renderList('/acme-demo/acme-docs?tab=pulls&status=open');

    expect(await screen.findByRole('link', { name: 'Improve onboarding' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Retire legacy banner' })).not.toBeInTheDocument();
  });
});
