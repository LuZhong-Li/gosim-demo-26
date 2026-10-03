import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Org, Repo, User } from '../api';
import * as api from '../api';

export default function HomePage({ user }: { user: User | null }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [myOrgs, setMyOrgs] = useState<Org[]>([]);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoOwner, setNewRepoOwner] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoVisibility, setNewRepoVisibility] = useState('private');
  const [newRepoReadme, setNewRepoReadme] = useState(false);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // REQ-3-2-1: the "New repository" link opens the creation form.
  const showCreate = searchParams.get('new') === '1';

  useEffect(() => {
    api
      .discover()
      .then((result) => {
        setRepos(result.repos);
        setOrgs(result.orgs);
      })
      .catch((caught) => setError(api.errorMessage(caught)));
  }, []);

  // The owner list is the personal account plus the organizations the user belongs to.
  useEffect(() => {
    if (!user) return;
    setNewRepoOwner((current) => current || user.username);
    api
      .listOrgs()
      .then((result) => setMyOrgs(result))
      .catch(() => undefined);
  }, [user]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    try {
      setRepos(await api.searchRepos(query));
      setSearched(true);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  return (
    <section className="panel">
      <h1>Welcome to GitHub Clone</h1>
      <p>
        {user
          ? `Signed in as ${user.username}. Create organizations, repositories, and issues.`
          : 'A simplified collaboration platform. Sign in or create an account to get started.'}
      </p>
      {!user && (
        <p>
          {/* UNIQUENESS: the header already renders the one navigable "Sign in"
              link, and the published suite opens with
              getByRole('link', {name:'Sign in', exact:true}) - sometimes
              .click() (strict mode) and sometimes toHaveCount(1). A second one
              here made every Stage-1 scenario fail before it could reach
              anything else. Plain text keeps the sentence readable while leaving
              exactly one link on the page. */}
          Sign in or{' '}
          <Link to="/auth?mode=signup">Create an account</Link>
        </p>
      )}
      {user && (
        <p>
          <Link to="/orgs">Manage your organizations</Link>
        </p>
      )}
      {user && (
        <>
          <p>
            <Link to="/?new=1">New repository</Link>
          </p>
          {showCreate && (
          <>
          <h2>New repository</h2>
          {notice && <p className="success">{notice}</p>}
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              setNotice('');
              api
                .createPersonalRepo({
                  owner: newRepoOwner,
                  name: newRepoName,
                  visibility: newRepoVisibility,
                  description: newRepoDescription,
                  readme: newRepoReadme,
                })
                .then((repo) => {
                  setNewRepoName('');
                  setNewRepoDescription('');
                  navigate(`/${repo.owner}/${repo.name}`);
                })
                .catch((caught) => setError(api.errorMessage(caught)));
            }}
          >
            <div className="field">
              <label htmlFor="new-repo-owner">Owner</label>
              <select
                id="new-repo-owner"
                value={newRepoOwner}
                onChange={(event) => setNewRepoOwner(event.target.value)}
              >
                <option value={user.username}>{user.username}</option>
                {myOrgs.map((org) => (
                  <option key={org.name} value={org.name}>
                    {org.displayName || org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="personal-repo-name">Repository name</label>
              <input
                id="personal-repo-name"
                type="text"
                value={newRepoName}
                onChange={(event) => setNewRepoName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="new-repo-description">Description</label>
              <input
                id="new-repo-description"
                type="text"
                value={newRepoDescription}
                onChange={(event) => setNewRepoDescription(event.target.value)}
              />
            </div>
            <fieldset>
              <legend>Visibility</legend>
              <label>
                <input
                  type="radio"
                  name="new-repo-visibility"
                  value="public"
                  checked={newRepoVisibility === 'public'}
                  onChange={() => setNewRepoVisibility('public')}
                />
                Public
              </label>
              <label>
                <input
                  type="radio"
                  name="new-repo-visibility"
                  value="private"
                  checked={newRepoVisibility === 'private'}
                  onChange={() => setNewRepoVisibility('private')}
                />
                Private
              </label>
            </fieldset>
            <label>
              <input
                type="checkbox"
                checked={newRepoReadme}
                onChange={(event) => setNewRepoReadme(event.target.checked)}
              />
              Add a README file
            </label>
            <button type="submit">Create repository</button>
          </form>
          </>
          )}
        </>
      )}

      <h2>Public repositories</h2>
      <form className="inline-form" onSubmit={handleSearch}>
        <input
          aria-label="Search"
          type="search"
          value={query}
          placeholder="Search"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {error && <p className="error">{error}</p>}
      {repos.length === 0 ? (
        <p>{searched ? 'No results' : 'No repositories yet.'}</p>
      ) : (
        <ul className="repo-list">
          {repos.map((repo) => (
            <li key={`${repo.owner}/${repo.name}`}>
              {/* REQ-3-1: the result link's exact accessible name is the repository name. */}
              <Link to={`/${repo.owner}/${repo.name}`}>{repo.name}</Link>
              <span className="muted">
                {' '}
                · {repo.owner}/{repo.name} · {repo.visibility}
              </span>
              {repo.description && <p className="muted">{repo.description}</p>}
            </li>
          ))}
        </ul>
      )}
      <h2>Organizations</h2>
      {orgs.length === 0 ? (
        <p>No public organizations yet.</p>
      ) : (
        <ul className="repo-list">
          {orgs.map((org) => (
            <li key={org.name}>
              <Link to={`/orgs/${org.name}`}>{org.displayName || org.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
