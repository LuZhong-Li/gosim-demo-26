import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Org, Team } from '../api';
import * as api from '../api';

// REQ-2-2-1 / REQ-2-2-2: the team detail page titled "organization/team".
export default function TeamPage() {
  const { name = '', team = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [org, setOrg] = useState<Org | null>(null);
  const [detail, setDetail] = useState<Team | null>(null);
  const [teams, setTeams] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [parentDraft, setParentDraft] = useState('');
  const section = searchParams.get('tab') === 'settings' ? 'settings' : 'members';

  const load = useCallback(async () => {
    try {
      const result = await api.getTeam(name, team);
      setOrg(result.org);
      setDetail(result.team);
      setTeams(result.teams);
      setRole(result.role);
      setParentDraft(result.team.parent || '');
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [name, team]);

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

  const canManage = role === 'Owner' || role === 'Admin';

  return (
    <section className="panel">
      <h1>{`${org?.name || name}/${team}`}</h1>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}
      <nav className="tabs" aria-label="Team navigation">
        <Link
          className={section === 'members' ? 'active' : ''}
          to={`/orgs/${name}/teams/${team}?tab=members`}
        >
          Members
        </Link>
        <Link
          className={section === 'settings' ? 'active' : ''}
          to={`/orgs/${name}/teams/${team}?tab=settings`}
        >
          Settings
        </Link>
      </nav>

      {section === 'members' && (
        <>
          <h2>Members</h2>
          {(detail?.members || []).length === 0 ? (
            <p className="muted">No team members yet.</p>
          ) : (
            <ul className="repo-list">
              {(detail?.members || []).map((member) => (
                <li key={member}>
                  {member}
                  {canManage && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        void run(
                          () => api.removeTeamMember(name, team, member),
                          'Team member removed.',
                        )
                      }
                    >
                      {`Remove ${member}`}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canManage && !addOpen && (
            <button type="button" onClick={() => setAddOpen(true)}>
              Add member
            </button>
          )}
          {canManage && addOpen && (
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => api.addTeamMember(name, team, username.trim()), 'Member added.');
                setUsername('');
                setAddOpen(false);
              }}
            >
              <label htmlFor="team-member-username">Username</label>
              <input
                id="team-member-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <button type="submit">Add member</button>
            </form>
          )}
        </>
      )}

      {section === 'settings' && (
        <>
          <h2>Settings</h2>
          {canManage ? (
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => api.setTeamParent(name, team, parentDraft), 'Team hierarchy updated.');
              }}
            >
              <label htmlFor="team-parent">Parent team</label>
              <select
                id="team-parent"
                aria-label="Parent team"
                value={parentDraft}
                onChange={(event) => setParentDraft(event.target.value)}
              >
                <option value="">None</option>
                {teams
                  .filter((entry) => entry !== team)
                  .map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
              </select>
              <button type="submit">Save</button>
            </form>
          ) : (
            <p className="muted">{`Parent team: ${detail?.parent || 'none'}`}</p>
          )}
        </>
      )}

      <p>
        <Link to={`/orgs/${name}`}>Back to organization</Link>
      </p>
    </section>
  );
}
