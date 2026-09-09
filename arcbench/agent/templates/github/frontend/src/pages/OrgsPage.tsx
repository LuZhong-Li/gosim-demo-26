import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Org } from '../api';
import * as api from '../api';

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function refresh() {
    try {
      setOrgs(await api.listOrgs());
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    try {
      await api.createOrg({ name, displayName });
      setName('');
      setDisplayName('');
      setInfo('Organization created.');
      await refresh();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  return (
    <section className="panel">
      <h1>Your organizations</h1>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}
      {orgs.length === 0 ? (
        <p>You do not belong to any organization yet.</p>
      ) : (
        <ul className="repo-list">
          {orgs.map((org) => (
            <li key={org.name}>
              <Link to={`/orgs/${org.name}`}>
                {org.displayName || org.name} ({org.name})
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2>Create organization</h2>
      <form className="form-grid" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="org-name">Organization name</label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="org-display">Display name (optional)</label>
          <input
            id="org-display"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <button type="submit">Create organization</button>
      </form>
    </section>
  );
}
