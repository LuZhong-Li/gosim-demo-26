import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';

type Protection = { branch: string; requiredApprovals: number; requiredChecks: string[] };
type AccessGrant = { subject: string; kind: 'user' | 'team'; permission: string };

const REPO_ROLES = ['Read', 'Triage', 'Write', 'Maintain', 'Admin'];

// REQ-3-4 / REQ-4-3-3 / REQ-6-1 live under the repository Settings surface.
export default function RepoSettingsPage({
  section,
}: {
  section: 'general' | 'branches' | 'access';
}) {
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
  // REQ-2-3: Manage access state.
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [canManageAccess, setCanManageAccess] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subject, setSubject] = useState<{ name: string; kind: 'user' | 'team' } | null>(null);
  const [newRole, setNewRole] = useState('Write');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

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
      const access = await api.getRepoAccess(owner, name);
      setCanManageAccess(access.canManage);
      setGrants(access.grants);
      setMembers(access.members);
      setTeams(access.teams);
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
  // Teams come first so a matching team option is easy to pick in the access picker.
  const subjects: { name: string; kind: 'user' | 'team' }[] = [
    ...teams.map((name) => ({ name, kind: 'team' as const })),
    ...members.map((name) => ({ name, kind: 'user' as const })),
  ];

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
        {/* REQ-2-3: Manage access is reached from the repository Settings surface. */}
        <Link className={section === 'access' ? 'active' : ''} to={`/${owner}/${name}/settings/access`}>
          Manage access
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

      {section === 'access' && (
        <div>
          <h2>Manage access</h2>
          {/* REQ-2-3: the picker hides its opening button while it is active. */}
          {canManageAccess && !pickerOpen && (
            <button type="button" onClick={() => setPickerOpen(true)}>
              Add people or teams
            </button>
          )}
          {canManageAccess && pickerOpen && (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (!subject) return;
                void run(
                  () =>
                    api.setRepoAccess(owner, name, {
                      subject: subject.name,
                      kind: subject.kind,
                      permission: newRole,
                    }),
                  'Access saved.',
                );
                setPickerOpen(false);
                setSubject(null);
                setSubjectQuery('');
              }}
            >
              <div className="field">
                <label htmlFor="access-search">Search</label>
                <input
                  id="access-search"
                  type="text"
                  value={subjectQuery}
                  onChange={(event) => {
                    setSubjectQuery(event.target.value);
                    setSubject(null);
                  }}
                />
              </div>
              <div role="listbox" aria-label="Access subjects">
                {subjects
                  .filter((entry) =>
                    entry.name.toLowerCase().includes(subjectQuery.trim().toLowerCase()),
                  )
                  .map((entry) => (
                    <button
                      key={`${entry.kind}:${entry.name}`}
                      type="button"
                      role="option"
                      aria-selected={subject?.name === entry.name && subject?.kind === entry.kind}
                      onClick={() => setSubject(entry)}
                    >
                      {entry.name}
                    </button>
                  ))}
              </div>
              <div className="field">
                <label htmlFor="access-role">Role</label>
                <select
                  id="access-role"
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value)}
                >
                  {REPO_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit">Add</button>
            </form>
          )}
          {grants.length === 0 ? (
            <p className="muted">No access grants yet.</p>
          ) : (
            <ul className="repo-list">
              {grants.map((grant) => (
                <li key={`${grant.kind}:${grant.subject}`} aria-label={grant.subject}>
                  <span>{`${grant.subject} · ${grant.permission}`}</span>
                  {/* While the picker is active only its own Role control is on screen. */}
                  {canManageAccess && !pickerOpen && (
                    <>
                      <label htmlFor={`role-${grant.kind}-${grant.subject}`}>Role</label>
                      <select
                        id={`role-${grant.kind}-${grant.subject}`}
                        aria-label="Role"
                        value={roleDrafts[grant.subject] ?? grant.permission}
                        onChange={(event) =>
                          setRoleDrafts({ ...roleDrafts, [grant.subject]: event.target.value })
                        }
                      >
                        {REPO_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          void run(
                            () =>
                              api.setRepoAccess(owner, name, {
                                subject: grant.subject,
                                kind: grant.kind,
                                permission: roleDrafts[grant.subject] ?? grant.permission,
                              }),
                            'Access saved.',
                          )
                        }
                      >
                        Save
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p>
        <Link to={`/${owner}/${name}`}>Back to repository</Link>
      </p>
    </section>
  );
}
