import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '../api';
import * as api from '../api';

export default function AuthPage({
  user,
  onAuth,
}: {
  user: User | null;
  onAuth: (user: User) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        await api.register({
          username,
          email,
          password,
          confirmPassword,
          terms,
        });
        setInfo('Account created. Please sign in.');
        setPassword('');
        setConfirmPassword('');
        setSearchParams({ mode: 'signin' });
      } else {
        const result = await api.login(email || username, password);
        api.tokenStore.set(result.token);
        onAuth(result.user);
        navigate('/');
      }
    } catch (caught) {
      setError(api.errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel narrow">
      <h1>{mode === 'signup' ? 'Create an account' : 'Sign in'}</h1>
      <p className="muted">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <a href="#signin" onClick={() => setSearchParams({ mode: 'signin' })}>
              Sign in
            </a>
          </>
        ) : (
          <>
            New here?{' '}
            <a href="#signup" onClick={() => setSearchParams({ mode: 'signup' })}>
              Create an account
            </a>
          </>
        )}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="success" role="status">
          {info}
        </p>
      )}
      <form className="form-grid" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="gh-username">Username</label>
            <input
              id="gh-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="gh-email">Email</label>
          <input
            id="gh-email"
            type="text"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="gh-password">Password</label>
          <input
            id="gh-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="gh-confirm">Confirm password</label>
            <input
              id="gh-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
        )}
        {mode === 'signup' && (
          <label className="check">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
            />
            I agree to the Terms of Service
          </label>
        )}
        <button type="submit" disabled={busy}>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
