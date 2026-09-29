import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Issue, Repo } from '../api';
import type { CommitDiff } from '../api';
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
  const [searchParams] = useSearchParams();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const requestedTab = searchParams.get('tab');
  // REQ-3-3 / REQ-3-2-3: Code / Issues / Pull requests are navigation links.
  const tab: 'code' | 'issues' | 'pulls' =
    requestedTab === 'issues' || requestedTab === 'pulls' ? requestedTab : 'code';
  const requestedPull = Number(searchParams.get('pull')) || null;
  const requestedFile = searchParams.get('file');
  const [searchTerm, setSearchTerm] = useState('');
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneProtocol, setCloneProtocol] = useState<'https' | 'ssh'>('https');
  const [copied, setCopied] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState<{ path: string; content: string } | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [commitDiff, setCommitDiff] = useState<CommitDiff | null>(null);
  const [showCommits, setShowCommits] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileBranch, setNewFileBranch] = useState('main');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileMessage, setNewFileMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [addFileOpen, setAddFileOpen] = useState(false);
  const [fileEditorOpen, setFileEditorOpen] = useState(false);
  const [fileEditorError, setFileEditorError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignee, setAssignee] = useState('');
  const [assigneePanel, setAssigneePanel] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeCandidates, setAssigneeCandidates] = useState<string[]>([]);
  const [labels, setLabels] = useState('');
  const [milestone, setMilestone] = useState('');
  const [issueTitleError, setIssueTitleError] = useState('');
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
      setNewFileBranch((current) => current || treeResult.defaultBranch || 'main');
      setFileContent(null);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [owner, name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // REQ-4-1: a search result links straight to the file it matched.
  useEffect(() => {
    if (!requestedFile || files.length === 0) return;
    if (!files.includes(requestedFile)) return;
    void openFile(requestedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedFile, files.length]);

  // REQ-5-3-1: assignable members come from the owning organization.
  useEffect(() => {
    if (!repo || repo.ownerType !== 'organization') return;
    api
      .getOrg(repo.owner)
      .then((detail) => setAssigneeCandidates(detail.members.map((member) => member.username)))
      .catch(() => undefined);
  }, [repo]);

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
        {repo.description || 'No description'} ·{' '}
        {/* REQ-3-3 / REQ-3-4: the overview shows a Public/Private marker. */}
        {repo.visibility === 'private' ? 'Private' : 'Public'} · default branch:{' '}
        {repo.defaultBranch}
      </p>
      {/* REQ-4-2-3: the repository page exposes one searchbox named "Search". */}
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          const term = searchTerm.trim();
          if (!term) return;
          navigate(`/${owner}/${name}/search?q=${encodeURIComponent(term)}`);
        }}
      >
        <input
          aria-label="Search"
          type="search"
          value={searchTerm}
          placeholder="Search"
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      <div className="repo-actions">
        {/* REQ-3-4 / REQ-4-3-3 / REQ-6-1: repository settings live behind this link. */}
        <Link to={`/${owner}/${name}/settings`}>Settings</Link>
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
        <Link className={tab === 'code' ? 'active' : ''} to={`/${owner}/${name}?tab=code`}>
          Code
        </Link>
        <Link className={tab === 'issues' ? 'active' : ''} to={`/${owner}/${name}?tab=issues`}>
          Issues ({issues.length})
        </Link>
        <Link className={tab === 'pulls' ? 'active' : ''} to={`/${owner}/${name}?tab=pulls`}>
          Pull requests
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      {tab === 'code' && (
        <>
          {/* REQ-3-2-3 Copy a Repository Clone URL: the popover opens from the Code button. */}
          <button
            type="button"
            className={cloneOpen ? 'active' : ''}
            onClick={() => {
              setCloneOpen((open) => !open);
              setCopied(false);
            }}
          >
            Code
          </button>
          {cloneOpen && (
            <div role="dialog" aria-label="Clone" className="clone-popover">
              <div role="tablist" aria-label="Clone protocol" className="tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={cloneProtocol === 'https'}
                  className={cloneProtocol === 'https' ? 'active' : ''}
                  onClick={() => {
                    setCloneProtocol('https');
                    setCopied(false);
                  }}
                >
                  HTTPS
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cloneProtocol === 'ssh'}
                  className={cloneProtocol === 'ssh' ? 'active' : ''}
                  onClick={() => {
                    setCloneProtocol('ssh');
                    setCopied(false);
                  }}
                >
                  SSH
                </button>
              </div>
              <div className="inline-form">
                <input
                  aria-label="Clone value"
                  readOnly
                  value={
                    cloneProtocol === 'https'
                      ? repo.cloneUrl || `https://arc-bench.local/${repo.owner}/${repo.name}.git`
                      : `git@arc-bench.local:${repo.owner}/${repo.name}.git`
                  }
                />
                <button
                  type="button"
                  onClick={() => {
                    // REQ-3-2-3: copying writes the selected value and shows "Copied".
                    const value =
                      cloneProtocol === 'https'
                        ? repo.cloneUrl || `https://arc-bench.local/${repo.owner}/${repo.name}.git`
                        : `git@arc-bench.local:${repo.owner}/${repo.name}.git`;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      void navigator.clipboard.writeText(value).catch(() => undefined);
                    }
                    setCopied(true);
                  }}
                >
                  Copy clone value
                </button>
              </div>
              {copied && <p className="success">Copied</p>}
            </div>
          )}
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
                  <button
                    type="button"
                    aria-label={`Delete ${filePath}`}
                    onClick={async () => {
                      if (!window.confirm(`Delete ${filePath}?`)) return;
                      setError('');
                      setInfo('');
                      try {
                        await api.deleteFile(owner, name, filePath, {
                          message: `Delete ${filePath}`,
                          branch: repo?.defaultBranch || 'main',
                        });
                        setInfo('File deleted.');
                        await refresh();
                      } catch (caught) {
                        setError(api.errorMessage(caught));
                      }
                    }}
                  >
                    Delete
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

          {/* REQ-4-4: the unique "Add file" button opens the "Create new file" menuitem. */}
          <button type="button" onClick={() => setAddFileOpen((open) => !open)}>
            Add file
          </button>
          {addFileOpen && (
            <div role="menu" aria-label="Add file">
              <button type="button" role="menuitem" onClick={() => setFileEditorOpen(true)}>
                Create new file
              </button>
            </div>
          )}
          {fileEditorOpen && (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              // REQ-4-4: invalid path and empty commit message messages.
              if (!/^[A-Za-z0-9_./-]{1,200}$/.test(newFilePath) || newFilePath.startsWith('/') || newFilePath.includes('..')) {
                setFileEditorError('Invalid file path');
                return;
              }
              if (!newFileMessage.trim()) {
                setFileEditorError('Commit message is required');
                return;
              }
              setFileEditorError('');
              run(
                () =>
                  api.createFile(owner, name, newFilePath, {
                    content: newFileContent,
                    message: newFileMessage.trim(),
                    branch: newFileBranch,
                  }),
                'File created.',
              );
              setNewFilePath('');
              setNewFileContent('');
              setNewFileMessage('');
            }}
          >
            <div className="field">
              <label htmlFor="file-name">File name</label>
              <input
                id="file-name"
                type="text"
                value={newFilePath}
                placeholder="docs/guide.md"
                onChange={(event) => {
                  setNewFilePath(event.target.value);
                  if (fileEditorError) setFileEditorError('');
                }}
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
              <label htmlFor="file-content">File contents</label>
              <textarea
                id="file-content"
                rows={6}
                value={newFileContent}
                onChange={(event) => setNewFileContent(event.target.value)}
              />
            </div>
            {fileEditorError && <p className="error">{fileEditorError}</p>}
            <button type="submit">Commit changes</button>
          </form>
          )}

      <h2>Commits</h2>
      {/* REQ-4-2-2: inspect the difference introduced by a revision */}
      <button
        type="button"
        onClick={async () => {
          try {
            const list = commits.length ? commits : await api.listCommits(owner, name);
            const latest = list[0];
            if (!latest) return;
            setCommitDiff(await api.getCommitDiff(owner, name, latest.sha));
          } catch (caught) {
            setError(api.errorMessage(caught));
          }
        }}
      >
        View latest commit diff
      </button>
      {commitDiff && (
        <div className="diff-view">
          <p className="muted">
            {commitDiff.commit.message} · +{commitDiff.stats.added} / -{commitDiff.stats.removed}
          </p>
          {commitDiff.files.map((file) => (
            <div key={file.path}>
              <p>
                <strong>{file.path}</strong> <span className="muted">{file.status}</span>
              </p>
              <pre aria-label={`Commit diff for ${file.path}`}>
                {file.lines
                  .map(
                    (line) =>
                      `${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}${line.text}`,
                  )
                  .join('\n')}
              </pre>
            </div>
          ))}
        </div>
      )}
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
              // REQ-5-2-1: an empty title is rejected with the official message.
              if (!title.trim()) {
                setIssueTitleError('Title is required');
                return;
              }
              setIssueTitleError('');
              run(
                () =>
                  api.createIssue(owner, name, {
                    title: title.trim(),
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
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (issueTitleError) setIssueTitleError('');
                }}
              />
              {issueTitleError && <p className="error">{issueTitleError}</p>}
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
              {/* REQ-5-3-1: settings control with search + checkboxes, not free text */}
              <button
                type="button"
                aria-label="Assignees settings"
                aria-expanded={assigneePanel}
                onClick={() => setAssigneePanel((open) => !open)}
              >
                ⚙ Assignees
              </button>
              <span className="muted">{assignee || 'none'}</span>
            </div>
            {assigneePanel && (
              <div className="assignee-panel">
                <input
                  aria-label="Search assignees"
                  type="search"
                  value={assigneeQuery}
                  placeholder="Search members"
                  onChange={(event) => setAssigneeQuery(event.target.value)}
                />
                <ul className="repo-list">
                  {assigneeCandidates
                    .filter((candidate) =>
                      candidate.toLowerCase().includes(assigneeQuery.trim().toLowerCase()),
                    )
                    .map((candidate) => (
                      <li key={candidate}>
                        <label>
                          <input
                            type="checkbox"
                            aria-label={`Assign ${candidate}`}
                            checked={assignee
                              .split(',')
                              .map((entry) => entry.trim())
                              .filter(Boolean)
                              .includes(candidate)}
                            onChange={(event) => {
                              const current = assignee
                                .split(',')
                                .map((entry) => entry.trim())
                                .filter(Boolean);
                              const next = event.target.checked
                                ? [...current, candidate]
                                : current.filter((entry) => entry !== candidate);
                              setAssignee(next.join(', '));
                            }}
                          />
                          {candidate}
                        </label>
                      </li>
                    ))}
                </ul>
                <button type="button" onClick={() => setAssigneePanel(false)}>
                  Close
                </button>
              </div>
            )}
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
            <button type="submit">Submit new issue</button>
          </form>
        </>
      )}
      {tab === 'pulls' && (
        <PullsTab owner={owner} name={name} initialPullNumber={requestedPull} />
      )}
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </section>
  );
}
