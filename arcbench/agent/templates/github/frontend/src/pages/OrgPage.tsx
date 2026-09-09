import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Org, Repo } from '../api';
import * as api from '../api';

export default function OrgPage() {
  const { name = '' } = useParams();
  const [org, setOrg] = useState<Org | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repoName, setRepoName] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refresh = useCallback(async () => {
    try {
      const result = await api.getOrg(name);
      setOrg(result.org);
      setRepos(result.repos);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreateRepo(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    try {
      await api.createOrgRepo(name, { name: repoName, visibility, description });
      setRepoName('');
      setDescription('');
      setInfo('Repository created.');
      await refresh();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  if (!org) {
    return (
      <section className="panel narrow">
        <h1>Organization</h1>
        {error && <p className="error">{error}</p>}
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>{org.displayName || org.name}</h1>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}
      <h2>Repositories</h2>
      {repos.length === 0 ? (
        <p>No repositories in this organization.</p>
      ) : (
        <ul className="repo-list">
          {repos.map((repo) => (
            <li key={`${repo.owner}/${repo.name}`}>
              <Link to={`/${repo.owner}/${repo.name}`}>
                {repo.owner}/{repo.name}
              </Link>
              <span className="muted"> · {repo.visibility}</span>
            </li>
          ))}
        </ul>
      )}
      <h2>Create repository</h2>
      <form className="form-grid" onSubmit={handleCreateRepo}>
        <div className="field">
          <label htmlFor="repo-name">Repository name</label>
          <input
            id="repo-name"
            type="text"
            value={repoName}
            onChange={(event) => setRepoName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="repo-visibility">Visibility</label>
          <select
            id="repo-visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value)}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="repo-description">Description (optional)</label>
          <input
            id="repo-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <button type="submit">Create repository</button>
      </form>
      <p>
        <Link to="/orgs">Back to organizations</Link>
      </p>
    </section>
  );
}
