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
  const [term, setTerm] = useState(query);
  const [pathDraft, setPathDraft] = useState(pathFilter);
  const [matches, setMatches] = useState<CodeMatch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const runSearch = useCallback(async () => {
    setError('');
    try {
      setMatches(await api.searchCode(owner, name, query, pathFilter));
    } catch (caught) {
      setMatches([]);
      setError(api.errorMessage(caught));
    } finally {
      setLoaded(true);
    }
  }, [owner, name, query, pathFilter]);

  useEffect(() => {
    setTerm(query);
    setPathDraft(pathFilter);
    void runSearch();
  }, [query, pathFilter, runSearch]);

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
          navigate(
            `/${owner}/${name}/search?q=${encodeURIComponent(term)}&path=${encodeURIComponent(pathDraft)}`,
          );
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
        <Link
          to={`/${owner}/${name}/search?q=${encodeURIComponent(term)}&path=${encodeURIComponent(pathDraft)}`}
        >
          Code
        </Link>
      </form>
      {error && <p className="error">{error}</p>}
      {loaded &&
        (matches.length === 0 ? (
          <p className="muted">No code results</p>
        ) : (
          <ul className="repo-list">
            {matches.map((match) => (
              <li key={`${match.path}:${match.line}`}>
                <Link to={`/${owner}/${name}?tab=code&file=${encodeURIComponent(match.path)}`}>
                  {`${match.path}:${match.line}`}
                </Link>
                <p className="muted">{match.snippet}</p>
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
