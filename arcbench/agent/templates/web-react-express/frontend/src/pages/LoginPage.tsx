import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '../api';
import * as api from '../api';

export default function LoginPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.login(identifier, password);
      api.tokenStore.set(result.token);
      onAuth(result.user);
      const next = searchParams.get('next');
      navigate(next && next.startsWith('/') ? next : '/');
    } catch (caught) {
      setError(api.errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel narrow">
      <h1>Sign in</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="login-identifier">Username or email</label>
          <input
            id="login-identifier"
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={busy}>
          Login
        </button>
      </form>
    </section>
  );
}
