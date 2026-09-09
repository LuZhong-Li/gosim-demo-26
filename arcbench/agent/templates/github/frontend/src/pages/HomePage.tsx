import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Org, Repo, User } from '../api';
import * as api from '../api';

export default function HomePage({ user }: { user: User | null }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .discover()
      .then((result) => {
        setRepos(result.repos);
        setOrgs(result.orgs);
      })
      .catch((caught) => setError(api.errorMessage(caught)));
  }, []);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    try {
      setRepos(await api.searchRepos(query));
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  return (
    <section className="panel">
      <h1>Welcome to GitHub Clone</h1>
      <p>
        {user
          ? `Signed in as ${user.username}. Create organizations, repositories, and issues.`
          : 'A simplified collaboration platform. Sign in or create an account to get started.'}
      </p>
      {!user && (
        <p>
          <Link to="/auth?mode=signin">Sign in</Link> ·{' '}
          <Link to="/auth?mode=signup">Create an account</Link>
        </p>
      )}
      {user && (
        <p>
          <Link to="/orgs">Manage your organizations</Link>
        </p>
      )}

      <h2>Public repositories</h2>
      <form className="inline-form" onSubmit={handleSearch}>
        <input
          aria-label="Search repositories"
          type="search"
          value={query}
          placeholder="Search repositories"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {error && <p className="error">{error}</p>}
      {repos.length === 0 ? (
        <p>No repositories yet.</p>
      ) : (
        <ul className="repo-list">
          {repos.map((repo) => (
            <li key={`${repo.owner}/${repo.name}`}>
              <Link to={`/${repo.owner}/${repo.name}`}>
                {repo.owner}/{repo.name}
              </Link>
              <span className="muted"> · {repo.visibility}</span>
              {repo.description && <p className="muted">{repo.description}</p>}
            </li>
          ))}
        </ul>
      )}
      <h2>Organizations</h2>
      {orgs.length === 0 ? (
        <p>No public organizations yet.</p>
      ) : (
        <ul className="repo-list">
          {orgs.map((org) => (
            <li key={org.name}>
              <Link to={`/orgs/${org.name}`}>{org.displayName || org.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
