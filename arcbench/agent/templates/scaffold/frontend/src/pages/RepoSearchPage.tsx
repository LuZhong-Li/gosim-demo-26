import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { CodeMatch } from '../api';
import * as api from '../api';

// REQ-4-2-3: the search results page exposes one searchbox named "Search"
// and a unique "Code" link that selects code results.
export default function RepoSearchPage() {
  const { owner = '', name = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const pathFilter = searchParams.get('path') || '';
  const languageFilter = searchParams.get('language') || '';
  const branchFilter = searchParams.get('branch') || '';
  const [term, setTerm] = useState(query);
  const [pathDraft, setPathDraft] = useState(pathFilter);
  const [matches, setMatches] = useState<CodeMatch[]>([]);
  const [branch, setBranch] = useState(branchFilter);
  const [languages, setLanguages] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const runSearch = useCallback(async () => {
    setError('');
    try {
      const result = await api.searchCode(owner, name, query, {
        path: pathFilter,
        language: languageFilter,
        branch: branchFilter,
      });
      setMatches(result.matches);
      setBranch(result.branch);
      setLanguages(result.languages);
    } catch (caught) {
      setMatches([]);
      setError(api.errorMessage(caught));
    } finally {
      setLoaded(true);
    }
  }, [owner, name, query, pathFilter, languageFilter, branchFilter]);

  useEffect(() => {
    setTerm(query);
    setPathDraft(pathFilter);
    void runSearch();
  }, [query, pathFilter, runSearch]);

  const searchUrl = (overrides: { term?: string; path?: string; language?: string } = {}) => {
    const params = new URLSearchParams();
    params.set('q', overrides.term ?? term);
    params.set('path', overrides.path ?? pathDraft);
    const language = overrides.language ?? languageFilter;
    if (language) params.set('language', language);
    if (branchFilter) params.set('branch', branchFilter);
    return `/${owner}/${name}/search?${params.toString()}`;
  };

  return (
    <section className="panel">
      <h1>
        {owner}/{name} search
      </h1>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!term.trim()) return;
          navigate(searchUrl());
        }}
      >
        <input
          aria-label="Search"
          type="search"
          value={term}
          placeholder="Search"
          onChange={(event) => setTerm(event.target.value)}
        />
        <input
          aria-label="Path filter"
          type="text"
          value={pathDraft}
          placeholder="Path filter (e.g. src/)"
          onChange={(event) => setPathDraft(event.target.value)}
        />
        {/* REQ-4-2-3: results can be narrowed by language. */}
        <label htmlFor="search-language">Language</label>
        <select
          id="search-language"
          aria-label="Language"
          value={languageFilter}
          onChange={(event) => {
            navigate(searchUrl({ language: event.target.value }));
          }}
        >
          <option value="">All languages</option>
          {(languages.length ? languages : ['typescript', 'javascript', 'markdown']).map(
            (language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ),
          )}
        </select>
        <Link to={searchUrl()}>
          Code
        </Link>
      </form>
      {/* REQ-4-2-3: results report the branch/revision they were read from. */}
      <p className="muted">{`Branch ${branch || 'main'}`}</p>
      {error && <p className="error">{error}</p>}
      {loaded &&
        (matches.length === 0 ? (
          <p className="muted">No code results</p>
        ) : (
          <ul className="repo-list">
            {matches.map((match) => (
              <li key={`${match.path}:${match.line}`}>
                <Link
                  to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(match.branch)}&file=${encodeURIComponent(match.path)}&line=${match.line}`}
                >
                  {`${match.path}:${match.line}`}
                </Link>
                <p className="muted">
                  {`${match.snippet} · ${match.branch} ${String(match.sha || '').slice(0, 7)}`}
                </p>
              </li>
            ))}
          </ul>
        ))}
      <p>
        <Link to={`/${owner}/${name}`}>Back to repository</Link>
      </p>
    </section>
  );
}
