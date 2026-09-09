import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Issue, Repo } from '../api';
import * as api from '../api';

export default function RepoPage() {
  const { owner = '', name = '' } = useParams();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [repoResult, issueResult] = await Promise.all([
        api.getRepo(owner, name),
        api.listIssues(owner, name),
      ]);
      setRepo(repoResult.repo);
      setIssues(issueResult);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [owner, name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreateIssue(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    try {
      await api.createIssue(owner, name, { title, body });
      setTitle('');
      setBody('');
      setInfo('Issue created.');
      await refresh();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  if (!repo) {
    return (
      <section className="panel narrow">
        <h1>{owner}/{name}</h1>
        {error && <p className="error">{error}</p>}
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>
        {repo.owner}/{repo.name}
      </h1>
      <p className="muted">
        {repo.description || 'No description'} · {repo.visibility} · default branch:{' '}
        {repo.defaultBranch}
      </p>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      <h2>Issues ({issues.length})</h2>
      {issues.length === 0 ? (
        <p>No issues yet.</p>
      ) : (
        <ul className="repo-list">
          {issues.map((issue) => (
            <li key={issue.number}>
              <span className="muted">#{issue.number}</span> {issue.title}
              <span className="muted">
                {' '}
                · {issue.state} · opened by {issue.author}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2>New issue</h2>
      <form className="form-grid" onSubmit={handleCreateIssue}>
        <div className="field">
          <label htmlFor="issue-title">Title</label>
          <input
            id="issue-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="issue-body">Body (optional)</label>
          <textarea
            id="issue-body"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <button type="submit">Create issue</button>
      </form>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </section>
  );
}
