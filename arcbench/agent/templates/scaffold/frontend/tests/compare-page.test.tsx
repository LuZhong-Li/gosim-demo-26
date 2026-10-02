import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import ComparePage from '../src/pages/ComparePage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  compareBranches: vi.fn(),
  createPull: vi.fn(),
  getTree: vi.fn(),
}));

function renderCompare() {
  return render(
    <MemoryRouter initialEntries={['/acme-demo/acme-docs/compare']}>
      <Routes>
        <Route path="/:owner/:name/compare" element={<ComparePage />} />
        <Route path="/:owner/:name" element={<div>Pull list destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ComparePage', () => {
  it('compares branches and creates a pull request from the valid diff', async () => {
    vi.mocked(api.getTree).mockResolvedValue({
      branches: ['main', 'feature-search'],
      files: [],
    });
    vi.mocked(api.compareBranches).mockResolvedValue({
      base: 'main',
      head: 'feature-search',
      same: false,
      hasDifference: true,
      commits: [{ sha: 'abc1234', message: 'Refine search', author: 'alice-dev', timestamp: '' }],
      files: [{ path: 'src/search.ts', status: 'modified', lines: [] }],
      stats: { changedFiles: 1, added: 1, removed: 1 },
    });
    vi.mocked(api.createPull).mockResolvedValue({
      number: 9,
      title: 'Search update',
      author: 'alice-dev',
      state: 'open',
      baseBranch: 'main',
      headBranch: 'feature-search',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const user = userEvent.setup();
    renderCompare();
    await user.selectOptions(await screen.findByRole('combobox', { name: 'compare' }), 'feature-search');
    await user.click(screen.getByRole('button', { name: 'Compare changes' }));

    expect(await screen.findByText('src/search.ts')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Title'), 'Search update');
    await user.click(screen.getByRole('button', { name: 'Create pull request' }));

    await waitFor(() =>
      expect(api.createPull).toHaveBeenCalledWith('acme-demo', 'acme-docs', {
        title: 'Search update',
        body: '',
        baseBranch: 'main',
        headBranch: 'feature-search',
      }),
    );
  });

  it('shows No changes immediately for the same branch', async () => {
    vi.mocked(api.getTree).mockResolvedValue({
      branches: ['main', 'feature-search'],
      files: [],
    });
    const user = userEvent.setup();
    renderCompare();

    await user.selectOptions(await screen.findByRole('combobox', { name: 'compare' }), 'main');
    expect(await screen.findByText('No changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create pull request' })).toBeDisabled();
  });
});
