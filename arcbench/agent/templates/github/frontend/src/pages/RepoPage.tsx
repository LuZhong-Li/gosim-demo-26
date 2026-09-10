import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Issue, Repo } from '../api';
import * as api from '../api';
import PullsTab from './PullsTab';

type Commit = {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  changed: string[];
};

export default function RepoPage() {
  const { owner = '', name = '' } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tab, setTab] = useState<'code' | 'issues' | 'pulls'>('code');
  const [files, setFiles] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState<{ path: string; content: string } | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [showCommits, setShowCommits] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileBranch, setNewFileBranch] = useState('main');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileMessage, setNewFileMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignee, setAssignee] = useState('');
  const [labels, setLabels] = useState('');
  const [milestone, setMilestone] = useState('');
  const [selected, setSelected] = useState<Issue | null>(null);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [repoResult, issueResult, treeResult] = await Promise.all([
        api.getRepo(owner, name),
        api.listIssues(owner, name),
        api.getTree(owner, name),
      ]);
      setRepo(repoResult.repo);
      setIssues(issueResult);
      setFiles(treeResult.files);
      setBranches(treeResult.branches);
      setFileContent(null);
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

  async function openFile(filePath: string) {
    try {
      setFileContent(await api.getFile(owner, name, filePath));
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function loadCommits() {
    try {
      setCommits(await api.listCommits(owner, name));
      setShowCommits(true);
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
        {/* REQ-3-2-2 Fork a Repository into Another Namespace */}
        <button
          type="button"
          onClick={async () => {
            setError('');
            setInfo('');
            try {
              const fork = await api.forkRepo(owner, name);
              navigate(`/${fork.owner}/${fork.name}`);
            } catch (caught) {
              setError(api.errorMessage(caught));
            }
          }}
        >
          Fork
        </button>
        <button type="button" className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>
          Code
        </button>
        <button
          type="button"
          className={tab === 'issues' ? 'active' : ''}
          onClick={() => setTab('issues')}
        >
          Issues ({issues.length})
        </button>
        <button
          type="button"
          className={tab === 'pulls' ? 'active' : ''}
          onClick={() => setTab('pulls')}
        >
          Pull requests
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      {tab === 'code' && (
        <>
          {/* REQ-3-2-3 Copy a Repository Clone URL */}
          <h2>Clone</h2>
          <div className="inline-form">
            <input
              aria-label="Clone URL"
              readOnly
              value={repo.cloneUrl || `https://arc-bench.local/${repo.owner}/${repo.name}.git`}
            />
            <button
              type="button"
              onClick={() => {
                const value =
                  repo.cloneUrl || `https://arc-bench.local/${repo.owner}/${repo.name}.git`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard
                    .writeText(value)
                    .then(() => setInfo('Clone URL copied.'))
                    .catch(() => setInfo('Clone URL ready to copy.'));
                } else {
                  setInfo('Clone URL ready to copy.');
                }
              }}
            >
              Copy
            </button>
          </div>
          <h2>Branches</h2>
          {branches.length === 0 ? <p className="muted">No branches.</p> : <p>{branches.join(', ')}</p>}
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => api.createBranch(owner, name, branchName), 'Branch created.');
              setBranchName('');
            }}
          >
            <input
              aria-label="New branch name"
              type="text"
              value={branchName}
              placeholder="branch name"
              onChange={(event) => setBranchName(event.target.value)}
            />
            <button type="submit">Create branch</button>
          </form>

          <h2>Files</h2>
          {files.length === 0 ? (
            <p className="muted">This repository has no files.</p>
          ) : (
            <ul className="repo-list">
              {files.map((filePath) => (
                <li key={filePath}>
                  <button className="link-button" type="button" onClick={() => openFile(filePath)}>
                    {filePath}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fileContent && (
            <div className="issue-detail">
              <h3>{fileContent.path}</h3>
              <pre>{fileContent.content}</pre>
            </div>
          )}

          <h2>Add file</h2>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () =>
                  api.createFile(owner, name, newFilePath, {
                    content: newFileContent,
                    message: newFileMessage,
                    branch: newFileBranch,
                  }),
                'File created.',
              );
              setNewFilePath('');
              setNewFileBranch('main');
              setNewFileContent('');
              setNewFileMessage('');
            }}
          >
            <div className="field">
              <label htmlFor="file-path">File path</label>
              <input
                id="file-path"
                type="text"
                value={newFilePath}
                placeholder="docs/guide.md"
                onChange={(event) => setNewFilePath(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="file-message">Commit message</label>
              <input
                id="file-message"
                type="text"
                value={newFileMessage}
                onChange={(event) => setNewFileMessage(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="file-branch">Branch</label>
              <input
                id="file-branch"
                type="text"
                value={newFileBranch}
                onChange={(event) => setNewFileBranch(event.target.value)}
              />
            </div>
            <div className="field full">
              <label htmlFor="file-content">Content</label>
              <textarea
                id="file-content"
                rows={6}
                value={newFileContent}
                onChange={(event) => setNewFileContent(event.target.value)}
              />
            </div>
            <button type="submit">Commit file</button>
          </form>

          <h2>Commits</h2>
          {!showCommits ? (
            <button type="button" onClick={loadCommits}>
              Load commit history
            </button>
          ) : commits.length === 0 ? (
            <p className="muted">No commits yet.</p>
          ) : (
            <ul className="repo-list">
              {commits.map((commit) => (
                <li key={commit.sha}>
                  <strong>{commit.message}</strong>
                  <span className="muted">
                    {' '}
                    · {commit.sha.slice(0, 7)} · {commit.author} ·{' '}
                    {new Date(commit.timestamp).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'issues' && (
        <>
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
                {selected.state} by {selected.author} · assignees:{' '}
                {(selected.assignees && selected.assignees.length
                  ? selected.assignees
                  : selected.assignee
                    ? [selected.assignee]
                    : []
                ).join(', ') || 'none'}{' '}
                ·
                milestone: {selected.milestone || 'none'} · labels:{' '}
                {selected.labels && selected.labels.length ? selected.labels.join(', ') : 'none'}
              </p>
              {selected.body && <p>{selected.body}</p>}
              {/* REQ-5-2-3: reactions on the issue itself */}
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  run(
                    () => api.toggleIssueReaction(owner, name, selected.number, { type: '👍' }),
                    'Reaction updated.',
                  ).then(() => openIssue(selected.number))
                }
              >
                👍{' '}
                {
                  (selected.reactions || []).filter(
                    (reaction) => reaction.type === '👍' && !reaction.commentId,
                  ).length
                }
              </button>
              <button
                type="button"
                onClick={() =>
                  run(
                    () =>
                      api.updateIssue(owner, name, selected.number, {
                        state: selected.state === 'open' ? 'closed' : 'open',
                      }),
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
                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          run(
                            () =>
                              api.toggleIssueReaction(owner, name, selected.number, {
                                commentId: comment.id,
                                type: '👍',
                              }),
                            'Reaction updated.',
                          ).then(() => openIssue(selected.number))
                        }
                      >
                        👍{' '}
                        {
                          (selected.reactions || []).filter(
                            (reaction) =>
                              reaction.type === '👍' && reaction.commentId === comment.id,
                          ).length
                        }
                      </button>
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
                () =>
                  api.createIssue(owner, name, {
                    title,
                    body,
                    assignees: assignee
                      .split(',')
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                    labels: labels
                      .split(',')
                      .map((label) => label.trim())
                      .filter(Boolean),
                    milestone: milestone || undefined,
                  }),
                'Issue created.',
              );
              setTitle('');
              setBody('');
              setAssignee('');
              setLabels('');
              setMilestone('');
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
                rows={3}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="issue-assignee">Assignees (comma separated)</label>
              <input
                id="issue-assignee"
                type="text"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="issue-labels">Labels (comma separated)</label>
              <input
                id="issue-labels"
                type="text"
                value={labels}
                onChange={(event) => setLabels(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="issue-milestone">Milestone</label>
              <input
                id="issue-milestone"
                type="text"
                value={milestone}
                onChange={(event) => setMilestone(event.target.value)}
              />
            </div>
            <button type="submit">Create issue</button>
          </form>
        </>
      )}
      {tab === 'pulls' && <PullsTab owner={owner} name={name} />}
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </section>
  );
}
