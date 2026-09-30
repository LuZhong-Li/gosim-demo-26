import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import RepoSearchPage from '../src/pages/RepoSearchPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  searchCode: vi.fn(),
}));

const result = {
  branch: 'main',
  languages: ['typescript', 'javascript', 'markdown'],
  matches: [
    {
      path: 'src/search.ts',
      line: 2,
      snippet: 'export function search(items, query) {',
      branch: 'main',
      sha: 'cmunn3apow3u39a',
    },
  ],
};

function renderSearch(url = '/acme-demo/acme-docs/search?q=search') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/:owner/:name/search" element={<RepoSearchPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('repository code search page', () => {
  it('offers one Search box, one Code link, a language filter and branch context', async () => {
    vi.mocked(api.searchCode).mockResolvedValue(result);
    renderSearch();

    expect(await screen.findByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getAllByRole('searchbox', { name: 'Search' })).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: 'Code' })).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByText('Branch main')).toBeInTheDocument();
  });

  it('links each result to the matching file and line on its branch', async () => {
    vi.mocked(api.searchCode).mockResolvedValue(result);
    renderSearch();

    const link = await screen.findByRole('link', { name: 'src/search.ts:2' });
    const href = link.getAttribute('href') || '';
    expect(href).toContain('tab=code');
    expect(href).toContain('branch=main');
    expect(href).toContain('file=src%2Fsearch.ts');
    expect(href).toContain('line=2');
    expect(screen.getByText(/main cmunn3a/)).toBeInTheDocument();
  });

  it('passes the language filter and path filter to the API', async () => {
    vi.mocked(api.searchCode).mockResolvedValue(result);
    const user = userEvent.setup();
    renderSearch();

    await screen.findByRole('link', { name: 'src/search.ts:2' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'typescript');

    await waitFor(() =>
      expect(api.searchCode).toHaveBeenLastCalledWith('acme-demo', 'acme-docs', 'search', {
        path: '',
        language: 'typescript',
        branch: '',
      }),
    );
  });

  it('shows the empty state when nothing matches', async () => {
    vi.mocked(api.searchCode).mockResolvedValue({ ...result, matches: [] });
    renderSearch('/acme-demo/acme-docs/search?q=nothing-matches');

    expect(await screen.findByText('No code results')).toBeInTheDocument();
  });
});
