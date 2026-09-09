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
  const [selected, setSelected] = useState<Issue | null>(null);
  const [commentText, setCommentText] = useState('');
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

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setError('');
    setInfo('');
    try {
      await action();
      setInfo(successMessage);
      await refresh();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function openIssue(number: number) {
    try {
      const issue = await api.getIssue(owner, name, number);
      setSelected(issue);
      setCommentText('');
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  if (!repo) {
    return (
      <section className="panel narrow">
        <h1>
          {owner}/{name}
        </h1>
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
      <div className="repo-actions">
        <button
          type="button"
          onClick={() =>
            run(
              () =>
                api.setRepoVisibility(
                  owner,
                  name,
                  repo.visibility === 'public' ? 'private' : 'public',
                ),
              'Visibility updated.',
            )
          }
        >
          Make {repo.visibility === 'public' ? 'private' : 'public'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      <h2>Issues ({issues.length})</h2>
      {issues.length === 0 ? (
        <p>No issues yet.</p>
      ) : (
        <ul className="repo-list">
          {issues.map((issue) => (
            <li key={issue.number}>
              <button className="link-button" type="button" onClick={() => openIssue(issue.number)}>
                #{issue.number} {issue.title}
              </button>
              <span className="muted">
                {' '}
                · {issue.state} · opened by {issue.author}
              </span>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="issue-detail">
          <h3>
            #{selected.number} {selected.title}
          </h3>
          <p className="muted">
            {selected.state} by {selected.author}
          </p>
          {selected.body && <p>{selected.body}</p>}
          <button
            type="button"
            onClick={() =>
              run(
                () => api.setIssueState(owner, name, selected.number, selected.state === 'open' ? 'closed' : 'open'),
                'Issue state updated.',
              ).then(() => openIssue(selected.number))
            }
          >
            {selected.state === 'open' ? 'Close issue' : 'Reopen issue'}
          </button>
          <h4>Comments</h4>
          {(selected.comments || []).length === 0 ? (
            <p className="muted">No comments.</p>
          ) : (
            <ul className="repo-list">
              {(selected.comments || []).map((comment) => (
                <li key={comment.id}>
                  <strong>{comment.author}</strong>
                  <p>{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () => api.addIssueComment(owner, name, selected.number, commentText),
                'Comment added.',
              ).then(() => openIssue(selected.number));
              setCommentText('');
            }}
          >
            <input
              aria-label="Comment body"
              type="text"
              value={commentText}
              placeholder="Write a comment"
              onChange={(event) => setCommentText(event.target.value)}
            />
            <button type="submit">Comment</button>
          </form>
        </div>
      )}

      <h2>New issue</h2>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => api.createIssue(owner, name, { title, body }),
            'Issue created.',
          );
          setTitle('');
          setBody('');
        }}
      >
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
