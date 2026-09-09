import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Repo, User } from '../api';
import * as api from '../api';

export default function HomePage({ user }: { user: User | null }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listRepos()
      .then(setRepos)
      .catch((caught) => setError(api.errorMessage(caught)));
  }, []);

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
    </section>
  );
}
