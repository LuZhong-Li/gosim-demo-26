import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Issue, Repo } from '../api';
import type { CommitDiff } from '../api';
import * as api from '../api';
import BranchSelector from '../components/BranchSelector';
import MilestonePicker from '../components/MilestonePicker';
import { relativeTime, stateLabel } from '../labels';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const requestedTab = searchParams.get('tab');
  // REQ-3-3 / REQ-3-2-3: Code / Issues / Pull requests are navigation links.
  const tab: 'code' | 'issues' | 'pulls' =
    requestedTab === 'issues' || requestedTab === 'pulls' ? requestedTab : 'code';
  const requestedPull = Number(searchParams.get('pull')) || null;
  const requestedFile = searchParams.get('file');
  const codeView = searchParams.get('view') || '';
  const requestedBranch = searchParams.get('branch') || '';
  const requestedPath = searchParams.get('path') || '';
  const [currentBranch, setCurrentBranch] = useState('');
  const requestedIssue = Number(searchParams.get('issue')) || null;
  // REQ-5-1-1: state, keyword and label filters live in the URL so a refresh keeps them.
  const issueState = searchParams.get('state') === 'closed' ? 'closed' : 'open';
  const issueQuery = searchParams.get('q') || '';
  const issueLabel = searchParams.get('label') || '';
  const showIssueForm = searchParams.get('new') === '1';
  const [issueSearch, setIssueSearch] = useState(issueQuery);
  const [editingIssueTitle, setEditingIssueTitle] = useState(false);
  const [editingIssueDescription, setEditingIssueDescription] = useState(false);
  const [issueTitleDraft, setIssueTitleDraft] = useState('');
  const [issueBodyDraft, setIssueBodyDraft] = useState('');
  const [issueEditError, setIssueEditError] = useState('');
  const [milestones, setMilestones] = useState<string[]>([]);
  const [forkOpen, setForkOpen] = useState(false);
  const [forkName, setForkName] = useState('');
  const [forkOwner, setForkOwner] = useState('');
  const [forkVisibility, setForkVisibility] = useState('public');
  const [myOrgs, setMyOrgs] = useState<api.Org[]>([]);
  const [forkError, setForkError] = useState('');
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
  const [labelCatalog, setLabelCatalog] = useState<string[]>([]);
  const [detailAssigneePanel, setDetailAssigneePanel] = useState(false);
  const [detailAssigneeQuery, setDetailAssigneeQuery] = useState('');
  const [detailLabelPanel, setDetailLabelPanel] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [issueTitleError, setIssueTitleError] = useState('');
  const [selected, setSelected] = useState<Issue | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [repoResult, issueResult, treeResult] = await Promise.all([
        api.getRepo(owner, name),
        api.listIssues(owner, name),
        api.getTree(owner, name, requestedBranch || undefined),
      ]);
      setRepo(repoResult.repo);
      setIssues(issueResult);
      setFiles(treeResult.files);
      setBranches(treeResult.branches);
      setCurrentBranch(treeResult.branch);
      setNewFileBranch((current) => current || treeResult.defaultBranch || 'main');
      setFileContent(null);
      void api
        .listMilestones(owner, name)
        .then(setMilestones)
        .catch(() => setMilestones([]));
      // REQ-5-3-2: the label selector offers only this repository's labels.
      void api
        .listLabels(owner, name)
        .then(setLabelCatalog)
        .catch(() => setLabelCatalog([]));
      // REQ-5-3-1: assignable members are the accounts with triage-or-higher.
      void api
        .listRepoMembers(owner, name)
        .then(setAssigneeCandidates)
        .catch(() => setAssigneeCandidates([]));
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [owner, name, requestedBranch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // REQ-3-2-2: the fork form offers the personal namespace plus organizations the user can write to.
  useEffect(() => {
    api
      .listOrgs()
      .then(setMyOrgs)
      .catch(() => setMyOrgs([]));
  }, []);

  useEffect(() => {
    setIssueSearch(issueQuery);
  }, [issueQuery]);

  useEffect(() => {
    if (!requestedIssue) return;
    void openIssue(requestedIssue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedIssue]);

  // REQ-4-1: a search result links straight to the file it matched.
  useEffect(() => {
    if (!requestedFile || files.length === 0) return;
    if (!files.includes(requestedFile)) return;
    void openFile(requestedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedFile, files.length]);

  // REQ-4-2-1: the "Commits" link opens the branch history in place.
  useEffect(() => {
    if (codeView !== 'commits') return;
    void loadCommits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeView]);

  // REQ-4-2-2: a short-hash link opens that revision's diff page.
  useEffect(() => {
    if (codeView !== 'commit') return;
    const sha = searchParams.get('sha');
    if (!sha) return;
    void showCommitDiff(sha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeView, searchParams.get('sha')]);

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
      setFileContent(
        await api.getFile(owner, name, filePath, requestedBranch || currentBranch || undefined),
      );
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

  // REQ-4-2-2: open one commit's diff from its short hash.
  async function showCommitDiff(sha: string) {
    try {
      setCommitDiff(await api.getCommitDiff(owner, name, sha));
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

  // REQ-5-3-1: the assignee area shows the saved set, falling back to the
  // single-assignee field used by older records.
  const currentAssignees: string[] = selected
    ? selected.assignees?.length
      ? selected.assignees
      : selected.assignee
        ? [selected.assignee]
        : []
    : [];
  const currentLabels: string[] = selected?.labels || [];

  async function saveAssignees(next: string[]) {
    if (!selected) return;
    await run(
      () => api.updateIssue(owner, name, selected.number, { assignees: next }),
      'Assignees updated.',
    ).then(() => openIssue(selected.number));
  }

  async function saveLabels(next: string[]) {
    if (!selected) return;
    await run(
      () => api.updateIssue(owner, name, selected.number, { labels: next }),
      'Labels updated.',
    ).then(() => openIssue(selected.number));
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
      {/* REQ-3-2-2: a fork records and shows its source repository. */}
      {repo.forkedFrom && (
        <p className="muted">
          {'Forked from '}
          <Link to={`/${repo.forkedFrom}`}>{repo.forkedFrom}</Link>
        </p>
      )}
      {forkOpen && (
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            setForkError('');
            try {
              const fork = await api.forkRepo(owner, name, {
                name: forkName.trim(),
                targetOwner: forkOwner,
                visibility: forkVisibility,
              });
              navigate(`/${fork.owner}/${fork.name}`);
            } catch (caught) {
              setForkError(api.errorMessage(caught));
            }
          }}
        >
          <div className="field">
            <label htmlFor="fork-owner">Owner</label>
            <select
              id="fork-owner"
              value={forkOwner}
              onChange={(event) => setForkOwner(event.target.value)}
            >
              {forkOwner && <option value={forkOwner}>{forkOwner}</option>}
              {myOrgs
                .filter((org) => org.role === 'Owner' || org.role === 'Admin')
                .map((org) => (
                  <option key={org.name} value={org.name}>
                    {org.displayName || org.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fork-name">Repository name</label>
            <input
              id="fork-name"
              type="text"
              value={forkName}
              onChange={(event) => setForkName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="fork-visibility">Visibility</label>
            <select
              id="fork-visibility"
              value={forkVisibility}
              disabled={repo.visibility === 'private'}
              onChange={(event) => setForkVisibility(event.target.value)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <button type="submit">Create fork</button>
          {forkError && <p className="error">{forkError}</p>}
        </form>
      )}
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
            setForkError('');
            setForkOpen(true);
            setForkName(name);
            setForkVisibility(repo.visibility === 'private' ? 'private' : 'public');
            try {
              const current = await api.me();
              setForkOwner(current.username);
            } catch {
              setForkOwner('');
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
          {/* REQ-4-3-1 / REQ-4-3-2: the branch selector drives the whole Code page. */}
          <BranchSelector
            current={currentBranch || requestedBranch || 'main'}
            branches={branches}
            canCreate={Boolean(repo.canWrite)}
            onSelect={(branch) => {
              setFileContent(null);
              navigate(`/${owner}/${name}?tab=code&branch=${encodeURIComponent(branch)}`);
            }}
            onCreate={(branch) => {
              void run(() => api.createBranch(owner, name, branch), 'Branch created.').then(() =>
                navigate(`/${owner}/${name}?tab=code&branch=${encodeURIComponent(branch)}`),
              );
            }}
          />

          <h2>Files</h2>
          {files.length === 0 ? (
            <p className="muted">This repository has no files.</p>
          ) : (
            <ul className="repo-list">
              {requestedPath
                ? files
                    .filter((filePath) => filePath.startsWith(`${requestedPath}/`))
                    .map((filePath) => (
                      <li key={filePath}>
                        {/* REQ-4-1: a file entry is a link named after the file. */}
                        <Link
                          to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(currentBranch)}&path=${encodeURIComponent(requestedPath)}&file=${encodeURIComponent(filePath)}`}
                        >
                          {filePath.slice(requestedPath.length + 1)}
                        </Link>
                      </li>
                    ))
                : Array.from(
                    new Set(
                      files
                        .filter((filePath) => filePath.includes('/'))
                        .map((filePath) => filePath.split('/')[0]),
                    ),
                  ).map((directory) => (
                    <li key={`dir:${directory}`}>
                      <Link
                        to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(currentBranch)}&path=${encodeURIComponent(directory)}`}
                      >
                        {directory}
                      </Link>
                    </li>
                  ))}
              {(requestedPath
                ? []
                : files.filter((filePath) => !filePath.includes('/'))
              ).map((filePath) => (
                <li key={filePath}>
                  <Link
                    to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(currentBranch)}&file=${encodeURIComponent(filePath)}`}
                  >
                    {filePath}
                  </Link>
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
          {requestedPath && (
            <p>
              <Link to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(currentBranch)}`}>
                {owner}/{name}
              </Link>
              {` / ${requestedPath}`}
            </p>
          )}
          {fileContent && (
            <div className="issue-detail">
              <h3>{fileContent.path}</h3>
              {/* REQ-4-1: the file page shows the current branch as well as the path. */}
              <p className="muted">{`Branch ${currentBranch || requestedBranch || 'main'}`}</p>
              <pre>{fileContent.content}</pre>
              <p>
                <Link
                  to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(currentBranch)}&path=${encodeURIComponent(requestedPath)}&file=${encodeURIComponent(fileContent.path)}&view=commits`}
                >
                  Commits
                </Link>
              </p>
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

      {/* REQ-4-2-1: the repository and file pages each expose one history link named "Commits". */}
      {!fileContent && (
        <p>
          <Link to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(currentBranch)}&view=commits`}>
            Commits
          </Link>
        </p>
      )}
      {/* REQ-4-2-2: inspect the difference introduced by a revision */}
      <button
        type="button"
        onClick={async () => {
          try {
            const list = commits.length ? commits : await api.listCommits(owner, name);
            const latest = list[0];
            if (!latest) return;
            await showCommitDiff(latest.sha);
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
                    ·{' '}
                    {/* REQ-4-2-2: the short hash opens that revision's diff. */}
                    <Link
                      to={`/${owner}/${name}?tab=code&branch=${encodeURIComponent(currentBranch)}&view=commit&sha=${encodeURIComponent(commit.sha)}`}
                    >
                      {commit.sha.slice(0, 7)}
                    </Link>{' '}
                    · {commit.author} · {relativeTime(commit.timestamp)}
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
          {/* REQ-5-1-1: Open and Closed are links, not buttons or tabs. */}
          <nav className="tabs" aria-label="Issue state filters">
            <Link
              className={issueState === 'open' ? 'active' : ''}
              to={`/${owner}/${name}?tab=issues&state=open`}
            >
              Open
            </Link>
            <Link
              className={issueState === 'closed' ? 'active' : ''}
              to={`/${owner}/${name}?tab=issues&state=closed`}
            >
              Closed
            </Link>
          </nav>
          <div className="inline-form">
            {/* REQ-5-1-1: the search box filters as the user types. */}
            <input
              aria-label="Search issues"
              type="search"
              value={issueSearch}
              placeholder="Search issues"
              onChange={(event) => {
                const value = event.target.value;
                setIssueSearch(value);
                const next = new URLSearchParams(searchParams);
                next.set('tab', 'issues');
                next.set('state', issueState);
                if (value) next.set('q', value);
                else next.delete('q');
                setSearchParams(next, { replace: true });
              }}
            />
            <label htmlFor="issue-label-filter">Label</label>
            <select
              id="issue-label-filter"
              aria-label="Label"
              value={issueLabel}
              onChange={(event) => {
                const value = event.target.value;
                const next = new URLSearchParams(searchParams);
                next.set('tab', 'issues');
                next.set('state', issueState);
                if (value) next.set('label', value);
                else next.delete('label');
                setSearchParams(next, { replace: true });
              }}
            >
              <option value="">All labels</option>
              {Array.from(new Set(issues.flatMap((issue) => issue.labels || []))).map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <Link to={`/${owner}/${name}?tab=issues&new=1`}>New issue</Link>
          </div>
          {(() => {
            const visible = issues.filter(
              (issue) =>
                issue.state === issueState &&
                (!issueQuery ||
                  issue.title.toLowerCase().includes(issueQuery.toLowerCase()) ||
                  String(issue.body || '')
                    .toLowerCase()
                    .includes(issueQuery.toLowerCase())) &&
                (!issueLabel || (issue.labels || []).includes(issueLabel)),
            );
            return visible.length === 0 ? (
              <p>No issues match this filter.</p>
            ) : (
              <ul className="repo-list">
                {visible.map((issue) => (
                  <li key={issue.number}>
                    {/* REQ-5-1-1: each result title is a link with the exact title as its name. */}
                    <Link to={`/${owner}/${name}?tab=issues&issue=${issue.number}`}>
                      {issue.title}
                    </Link>
                    <span className="muted">
                      {' '}
                      # {issue.number} · {stateLabel(issue.state)} · opened by {issue.author}
                      {(issue.labels || []).length > 0 && ` · ${issue.labels?.join(', ')}`}
                      {issue.milestone ? ` · milestone ${issue.milestone}` : ''}
                      {/* REQ-5-1-1: each row also shows the update time. */}
                      {` · updated ${relativeTime(issue.updatedAt || issue.createdAt)}`}
                    </span>
                  </li>
                ))}
              </ul>
            );
          })()}

          {selected && (
            <div className="issue-detail">
              {/* REQ-5-2-1 / REQ-5-2-2: the heading carries the exact issue title. */}
              <h3>{selected.title}</h3>
              <p className="muted">
                # {selected.number} · {stateLabel(selected.state)} · opened by {selected.author}
              </p>
              {/* REQ-5-1-2: the right side lists Assignees, Labels and Milestone. */}
              <div className="issue-meta">
                <section>
                  <h4>Assignees</h4>
                  <button
                    type="button"
                    aria-label="Assignees"
                    aria-expanded={detailAssigneePanel}
                    onClick={() => setDetailAssigneePanel((open) => !open)}
                  >
                    ⚙
                  </button>
                  <p>{currentAssignees.length ? currentAssignees.join(', ') : 'No one — assign yourself'}</p>
                  {detailAssigneePanel && (
                    <div className="assignee-panel">
                      <input
                        aria-label="Search assignees"
                        type="search"
                        placeholder="Search members"
                        value={detailAssigneeQuery}
                        onChange={(event) => setDetailAssigneeQuery(event.target.value)}
                      />
                      <ul className="repo-list">
                        {assigneeCandidates
                          .filter((candidate) =>
                            candidate
                              .toLowerCase()
                              .includes(detailAssigneeQuery.trim().toLowerCase()),
                          )
                          .map((candidate) => (
                            <li key={candidate}>
                              <label>
                                <input
                                  type="checkbox"
                                  aria-label={candidate}
                                  checked={currentAssignees.includes(candidate)}
                                  onChange={(event) => {
                                    void saveAssignees(
                                      event.target.checked
                                        ? [...currentAssignees, candidate]
                                        : currentAssignees.filter((entry) => entry !== candidate),
                                    );
                                  }}
                                />
                                {candidate}
                              </label>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </section>
                <section>
                  <h4>Labels</h4>
                  <button
                    type="button"
                    aria-label="Labels"
                    aria-expanded={detailLabelPanel}
                    onClick={() => setDetailLabelPanel((open) => !open)}
                  >
                    ⚙
                  </button>
                  <p>{currentLabels.length ? currentLabels.join(', ') : 'None yet'}</p>
                  {detailLabelPanel && (
                    <ul className="repo-list">
                      {labelCatalog.map((labelName) => (
                        <li key={labelName}>
                          <label>
                            <input
                              type="checkbox"
                              aria-label={labelName}
                              checked={currentLabels.includes(labelName)}
                              onChange={(event) => {
                                void saveLabels(
                                  event.target.checked
                                    ? [...currentLabels, labelName]
                                    : currentLabels.filter((entry) => entry !== labelName),
                                );
                              }}
                            />
                            {labelName}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
              {/* REQ-5-3-3: milestone selection lives on the right of the detail view. */}
              <MilestonePicker
                current={selected.milestone || null}
                milestones={milestones}
                canEdit={Boolean(selected.canTriage)}
                onSelect={(value) =>
                  void run(
                    () =>
                      api.updateIssue(owner, name, selected.number, { milestone: value || null }),
                    'Milestone updated.',
                  ).then(() => openIssue(selected.number))
                }
              />
              {selected.body && <p>{selected.body}</p>}
              {/* REQ-5-2-2: unique edit buttons for the title and the description. */}
              {selected.canEdit && (
                <div className="inline-form">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIssueTitle((open) => !open);
                      setIssueTitleDraft(selected.title);
                      setIssueEditError('');
                    }}
                  >
                    Edit issue title
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIssueDescription((open) => !open);
                      setIssueBodyDraft(selected.body || '');
                      setIssueEditError('');
                    }}
                  >
                    Edit issue description
                  </button>
                </div>
              )}
              {editingIssueTitle && (
                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!issueTitleDraft.trim()) {
                      setIssueEditError('Title is required');
                      return;
                    }
                    setIssueEditError('');
                    void run(
                      () => api.updateIssue(owner, name, selected.number, { title: issueTitleDraft.trim() }),
                      'Issue title saved.',
                    ).then(() => {
                      setEditingIssueTitle(false);
                      void openIssue(selected.number);
                    });
                  }}
                >
                  <div className="field">
                    <label htmlFor="issue-title-edit">Issue title</label>
                    <input
                      id="issue-title-edit"
                      type="text"
                      value={issueTitleDraft}
                      onChange={(event) => setIssueTitleDraft(event.target.value)}
                    />
                  </div>
                  <button type="submit">Save issue title</button>
                  {issueEditError && <p className="error">{issueEditError}</p>}
                </form>
              )}
              {editingIssueDescription && (
                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setIssueEditError('');
                    void run(
                      () => api.updateIssue(owner, name, selected.number, { body: issueBodyDraft }),
                      'Issue description saved.',
                    ).then(() => {
                      setEditingIssueDescription(false);
                      void openIssue(selected.number);
                    });
                  }}
                >
                  <div className="field">
                    <label htmlFor="issue-description-edit">Issue description</label>
                    <textarea
                      id="issue-description-edit"
                      rows={3}
                      value={issueBodyDraft}
                      onChange={(event) => setIssueBodyDraft(event.target.value)}
                    />
                  </div>
                  <button type="submit">Save issue description</button>
                </form>
              )}
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
              {/* REQ-5-4: read-only viewers must not see either status control. */}
              {selected.canClose && (
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
              )}
              <h4>Comments</h4>
              {(selected.comments || []).length === 0 ? (
                <p className="muted">No comments.</p>
              ) : (
                <ul className="repo-list">
                  {(selected.comments || []).map((comment) => (
                    <li key={comment.id}>
                      {/* REQ-5-2-3: discussion entries use article semantics. */}
                      <article>
                        <strong>{comment.author}</strong>
                        <p>{comment.body}</p>
                      </article>
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
                  // REQ-5-2-3: whitespace-only comments are rejected with the official message.
                  if (!commentText.trim()) {
                    setCommentError('Comment is required');
                    return;
                  }
                  setCommentError('');
                  run(
                    () => api.addIssueComment(owner, name, selected.number, commentText.trim()),
                    'Comment added.',
                  ).then(() => openIssue(selected.number));
                  setCommentText('');
                }}
              >
                <input
                  aria-label="Comment"
                  type="text"
                  value={commentText}
                  placeholder="Write a comment"
                  onChange={(event) => {
                    setCommentText(event.target.value);
                    if (commentError) setCommentError('');
                  }}
                />
                <button type="submit">Comment</button>
                {commentError && <p className="error">{commentError}</p>}
              </form>
              {/* REQ-5-4: status transitions appear in the activity timeline. */}
              {(selected.activities || []).length > 0 && (
                <>
                  <h4>Activity</h4>
                  <ul className="repo-list">
                    {(selected.activities || []).map((activity, index) => (
                      <li key={`${activity.type}-${index}`}>
                        <strong>{activity.type}</strong>
                        <span className="muted">
                          {` · ${activity.actor} · ${new Date(activity.at).toLocaleString()}`}
                        </span>
                        {/* REQ-5-2-3: a comment activity carries its body. */}
                        {activity.body && <p>{activity.body}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* REQ-5-2-1: the unique "New issue" link opens the creation form. */}
          {showIssueForm && (
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
                async () => {
                  const created = await api.createIssue(owner, name, {
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
                  });
                  // REQ-5-2-1: a successful submission opens the new issue detail.
                  navigate(`/${owner}/${name}?tab=issues&issue=${created.number}`);
                  return created;
                },
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
              <label htmlFor="issue-body">Description</label>
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
              <span>Labels</span>
              {/* REQ-5-3-2: only labels that already exist in this repository. */}
              <ul className="repo-list">
                {labelCatalog.map((labelName) => {
                  const chosen = labels
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean);
                  return (
                    <li key={labelName}>
                      <label>
                        <input
                          type="checkbox"
                          aria-label={labelName}
                          checked={chosen.includes(labelName)}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...chosen, labelName]
                              : chosen.filter((entry) => entry !== labelName);
                            setLabels(next.join(', '));
                          }}
                        />
                        {labelName}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="field">
              <label htmlFor="issue-milestone">Milestone</label>
              <select
                id="issue-milestone"
                value={milestone}
                onChange={(event) => setMilestone(event.target.value)}
              >
                <option value="">None</option>
                {milestones.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">Submit new issue</button>
          </form>
          )}
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
