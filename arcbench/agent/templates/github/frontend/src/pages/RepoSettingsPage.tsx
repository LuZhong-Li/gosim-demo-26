import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';

type Protection = { branch: string; requiredApprovals: number; requiredChecks: string[] };

// REQ-3-4 / REQ-4-3-3 / REQ-6-1 live under the repository Settings surface.
export default function RepoSettingsPage({ section }: { section: 'general' | 'branches' }) {
  const { owner = '', name = '' } = useParams();
  const [repo, setRepo] = useState<api.Repo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [protection, setProtection] = useState<Protection | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityDraft, setVisibilityDraft] = useState('public');
  const [defaultDraft, setDefaultDraft] = useState('');
  const [defaultConfirm, setDefaultConfirm] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleBranch, setRuleBranch] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [requireCheck, setRequireCheck] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.getRepo(owner, name);
      setRepo(result.repo);
      setVisibilityDraft(result.repo.visibility === 'private' ? 'private' : 'public');
      setDefaultDraft(result.repo.defaultBranch || 'main');
      setProtection(result.repo.protection || null);
      setRuleBranch((current) => current || result.repo.protection?.branch || result.repo.defaultBranch || 'main');
      const tree = await api.getTree(owner, name);
      setBranches(tree.branches);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [owner, name]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setError('');
    setInfo('');
    try {
      await action();
      await load();
      setInfo(successMessage);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  const canAdmin = Boolean(repo?.canAdmin);
  const hasRule = Boolean(protection && (protection.requiredApprovals > 0 || protection.requiredChecks.length > 0));

  return (
    <section className="panel">
      <h1>
        {owner}/{name} settings
      </h1>
      <nav className="tabs" aria-label="Repository settings navigation">
        <Link className={section === 'general' ? 'active' : ''} to={`/${owner}/${name}/settings/general`}>
          General
        </Link>
        <Link className={section === 'branches' ? 'active' : ''} to={`/${owner}/${name}/settings/branches`}>
          Branches
        </Link>
      </nav>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      {section === 'general' && (
        <div>
          <h2>Danger Zone</h2>
          <p className="muted">
            Current visibility: {repo?.visibility === 'private' ? 'Private' : 'Public'}
          </p>
          {canAdmin && (
            <button type="button" onClick={() => setVisibilityOpen(true)}>
              Change visibility
            </button>
          )}
          {visibilityOpen && (
            <div role="dialog" aria-label="Change visibility" className="form-grid">
              <fieldset>
                <legend>Visibility</legend>
                <label>
                  <input
                    type="radio"
                    name="visibility-choice"
                    value="public"
                    checked={visibilityDraft === 'public'}
                    onChange={() => setVisibilityDraft('public')}
                  />
                  Public
                </label>
                <label>
                  <input
                    type="radio"
                    name="visibility-choice"
                    value="private"
                    checked={visibilityDraft === 'private'}
                    onChange={() => setVisibilityDraft('private')}
                  />
                  Private
                </label>
              </fieldset>
              <div className="inline-form">
                <button
                  type="button"
                  onClick={() => {
                    void run(
                      () => api.updateRepo(owner, name, { visibility: visibilityDraft }),
                      'Visibility updated.',
                    );
                    setVisibilityOpen(false);
                  }}
                >
                  Confirm visibility
                </button>
                <button type="button" onClick={() => setVisibilityOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'branches' && (
        <div>
          <h2>Default branch</h2>
          {canAdmin ? (
            <>
              <label htmlFor="default-branch">Default branch</label>
              <select
                id="default-branch"
                aria-label="Default branch"
                value={defaultDraft}
                onChange={(event) => setDefaultDraft(event.target.value)}
              >
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setDefaultConfirm(true)}>
                Update
              </button>
              {defaultConfirm && (
                <div role="dialog" aria-label="Confirm default branch" className="inline-form">
                  <span className="muted">Use {defaultDraft} as the default branch?</span>
                  <button
                    type="button"
                    onClick={() => {
                      void run(
                        () => api.updateRepo(owner, name, { defaultBranch: defaultDraft }),
                        'Default branch updated.',
                      );
                      setDefaultConfirm(false);
                    }}
                  >
                    Confirm
                  </button>
                  <button type="button" onClick={() => setDefaultConfirm(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Current default branch: {repo?.defaultBranch || 'main'}</p>
          )}

          <h2>Branch protection rules</h2>
          {hasRule && protection && (
            <div className="issue-detail">
              <strong>{protection.branch}</strong>
              <ul className="repo-list">
                {protection.requiredApprovals > 0 && <li>{`${protection.requiredApprovals} approval`}</li>}
                {protection.requiredChecks.includes('test') && <li>Require status check test</li>}
              </ul>
            </div>
          )}
          {canAdmin && (
            <button type="button" onClick={() => setRuleOpen(true)}>
              Add branch protection rule
            </button>
          )}
          {ruleOpen && (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  () =>
                    api.setBranchProtection(owner, name, ruleBranch, {
                      requiredApprovals: requireApproval ? 1 : 0,
                      requiredChecks: requireCheck ? ['test'] : [],
                    }),
                  hasRule ? 'Branch protection rule saved.' : 'Branch protection rule created.',
                );
                setRuleOpen(false);
              }}
            >
              <div className="field">
                <label htmlFor="rule-branch">Branch name pattern</label>
                <input
                  id="rule-branch"
                  type="text"
                  value={ruleBranch}
                  onChange={(event) => setRuleBranch(event.target.value)}
                />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(event) => setRequireApproval(event.target.checked)}
                />
                Require 1 approval
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={requireCheck}
                  onChange={(event) => setRequireCheck(event.target.checked)}
                />
                Require status check test
              </label>
              <button type="submit">{hasRule ? 'Save changes' : 'Create'}</button>
            </form>
          )}
        </div>
      )}

      <p>
        <Link to={`/${owner}/${name}`}>Back to repository</Link>
      </p>
    </section>
  );
}
