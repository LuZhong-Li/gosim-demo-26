import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { BranchCompare, PullRequest } from '../api';
import * as api from '../api';

export default function ComparePage() {
  const { owner = '', name = '' } = useParams();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<string[]>([]);
  const [baseBranch, setBaseBranch] = useState('main');
  const [headBranch, setHeadBranch] = useState('');
  const [compare, setCompare] = useState<BranchCompare | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .getTree(owner, name)
      .then((tree) => {
        setBranches(tree.branches);
        setBaseBranch(tree.branches.includes('main') ? 'main' : tree.branches[0] || '');
      })
      .catch((caught) => setError(api.errorMessage(caught)));
  }, [owner, name]);

  useEffect(() => {
    setCompare(null);
    setInfo('');
  }, [baseBranch, headBranch]);

  const sameBranchSelection = Boolean(baseBranch && headBranch && baseBranch === headBranch);
  const creationDisabled =
    creating || sameBranchSelection || !compare || compare.same || !compare.hasDifference;

  const changedFiles = useMemo(() => compare?.files || [], [compare]);

  async function loadCompare() {
    setError('');
    if (!baseBranch || !headBranch) return;
    try {
      setCompare(await api.compareBranches(owner, name, baseBranch, headBranch));
    } catch (caught) {
      setCompare(null);
      setError(api.errorMessage(caught));
    }
  }

  async function createPull(event: React.FormEvent) {
    event.preventDefault();
    if (creationDisabled) return;
    setCreating(true);
    setError('');
    try {
      const pull: PullRequest = await api.createPull(owner, name, {
        title: title.trim(),
        body,
        baseBranch,
        headBranch,
      });
      navigate(`/${encodeURIComponent(owner)}/${encodeURIComponent(name)}?tab=pulls&pull=${pull.number}`);
    } catch (caught) {
      setError(api.errorMessage(caught));
    } finally {
      setCreating(false);
    }
  }

  async function createDraftPull() {
    if (creationDisabled) return;
    setCreating(true);
    setError('');
    try {
      const pull = await api.createPull(owner, name, {
        title: title.trim(),
        body,
        baseBranch,
        headBranch,
        draft: true,
      });
      navigate(`/${encodeURIComponent(owner)}/${encodeURIComponent(name)}?tab=pulls&pull=${pull.number}`);
    } catch (caught) {
      setError(api.errorMessage(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="panel">
      <p>
        <Link to={`/${owner}/${name}`}>Back to repository</Link>
      </p>
      <h1>Compare changes</h1>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="compare-base">Base</label>
          <select
            id="compare-base"
            aria-label="base"
            value={baseBranch}
            onChange={(event) => setBaseBranch(event.target.value)}
          >
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="compare-head">Compare</label>
          <select
            id="compare-head"
            aria-label="compare"
            value={headBranch}
            onChange={(event) => setHeadBranch(event.target.value)}
          >
            <option value="">(select branch)</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => void loadCompare()}>
          Compare changes
        </button>
      </div>

      {sameBranchSelection && (
        <div className="issue-detail">
          <h2>
            {baseBranch} → {headBranch}
          </h2>
          <p className="muted">No changes</p>
        </div>
      )}

      {!sameBranchSelection && compare && (
        <div className="issue-detail">
          <h2>
            {compare.base} → {compare.head}
          </h2>
          {compare.same || !compare.hasDifference ? (
            <p className="muted">No changes</p>
          ) : (
            <>
              <p className="muted">
                {compare.commits.length} commit(s) · {compare.stats.changedFiles} file(s) changed · +
                {compare.stats.added} / -{compare.stats.removed}
              </p>
              <ul className="repo-list">
                {compare.commits.map((commit) => (
                  <li key={commit.sha}>
                    <strong>{commit.message}</strong> · {commit.author} · {commit.sha.slice(0, 7)}
                  </li>
                ))}
              </ul>
              <ul className="repo-list">
                {changedFiles.map((file) => (
                  <li key={file.path}>
                    <strong>{file.path}</strong> <span className="muted">{file.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <form className="form-grid" onSubmit={createPull}>
        <div className="field">
          <label htmlFor="compare-title">Title</label>
          <input
            id="compare-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="compare-body">Description</label>
          <textarea
            id="compare-body"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <button type="submit" disabled={creationDisabled}>
          Create pull request
        </button>
        <button type="button" disabled={creationDisabled} onClick={() => void createDraftPull()}>
          Create draft pull request
        </button>
      </form>
    </section>
  );
}
