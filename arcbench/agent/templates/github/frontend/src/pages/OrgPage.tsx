import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Member, Org, Repo, Team } from '../api';
import * as api from '../api';

export default function OrgPage() {
  const { name = '' } = useParams();
  const [org, setOrg] = useState<Org | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [repoName, setRepoName] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [description, setDescription] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberRole, setMemberRole] = useState('Member');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [parentDraft, setParentDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refresh = useCallback(async () => {
    try {
      const detail = await api.getOrg(name);
      setOrg(detail.org);
      setRole(detail.role);
      setRepos(detail.repos);
      setMembers(detail.members);
      setTeams(detail.teams);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canManage = role === 'Owner' || role === 'Admin';

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
      {role && <p className="muted">Your role: {role}</p>}
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

      <h2>People</h2>
      {members.length === 0 ? (
        <p>No members yet.</p>
      ) : (
        <ul className="repo-list">
          {members.map((member) => (
            <li key={member.username}>
              {member.username} <span className="muted">· {member.role}</span>
              {/* REQ-2-2-4 Remove a Member from an Organization */}
              {role === 'Owner' && pendingRemoval !== member.username && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setPendingRemoval(member.username)}
                >
                  Remove from organization
                </button>
              )}
              {pendingRemoval === member.username && (
                <span className="inline-form">
                  <button
                    type="button"
                    onClick={() => {
                      run(
                        () => api.removeOrgMember(name, member.username),
                        'Member removed.',
                      );
                      setPendingRemoval(null);
                    }}
                  >
                    Remove
                  </button>
                  <button type="button" onClick={() => setPendingRemoval(null)}>
                    Cancel
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => api.addOrgMember(name, { username: memberUsername, role: memberRole }), 'Member added.');
            setMemberUsername('');
          }}
        >
          <input
            aria-label="Member username"
            type="text"
            value={memberUsername}
            placeholder="username"
            onChange={(event) => setMemberUsername(event.target.value)}
          />
          <select
            aria-label="Member role"
            value={memberRole}
            onChange={(event) => setMemberRole(event.target.value)}
          >
            <option>Read</option>
            <option>Triage</option>
            <option>Write</option>
            <option>Maintain</option>
            <option>Admin</option>
            <option>Member</option>
            <option>Owner</option>
          </select>
          <button type="submit">Add member</button>
        </form>
      )}

      <h2>Teams</h2>
      {teams.length === 0 ? (
        <p>No teams yet.</p>
      ) : (
        <ul className="repo-list">
          {teams.map((team) => (
            <li key={team.name} data-team={team.name}>
              {team.name} <span className="muted">· {team.members.length} members</span>
              <span className="muted"> · parent: {team.parent || 'none'}</span>
              {team.description && <p className="muted">{team.description}</p>}
              {/* REQ-2-2-2: hierarchy is editable and cycles are rejected server-side */}
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  run(
                    () => api.setTeamParent(name, team.name, parentDraft[team.name] ?? ''),
                    'Team hierarchy updated.',
                  );
                }}
              >
                <input
                  aria-label={`Parent team for ${team.name}`}
                  type="text"
                  value={parentDraft[team.name] ?? ''}
                  placeholder="parent team (blank to clear)"
                  onChange={(event) =>
                    setParentDraft({ ...parentDraft, [team.name]: event.target.value })
                  }
                />
                <button type="submit">Save parent</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {role && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => api.createTeam(name, { name: teamName, description: teamDescription }),
              'Team created.',
            );
            setTeamName('');
            setTeamDescription('');
          }}
        >
          <input
            aria-label="Team name"
            type="text"
            value={teamName}
            placeholder="team name"
            onChange={(event) => setTeamName(event.target.value)}
          />
          <input
            aria-label="Team description"
            type="text"
            value={teamDescription}
            placeholder="description (optional)"
            onChange={(event) => setTeamDescription(event.target.value)}
          />
          <button type="submit">Create team</button>
        </form>
      )}

      <h2>Create repository</h2>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => api.createOrgRepo(name, { name: repoName, visibility, description }),
            'Repository created.',
          );
          setRepoName('');
          setDescription('');
        }}
      >
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
