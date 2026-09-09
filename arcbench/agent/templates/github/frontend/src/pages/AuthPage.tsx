import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '../api';
import * as api from '../api';

export default function AuthPage({
  onAuth,
}: {
  user: User | null;
  onAuth: (user: User) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode') || 'signin';
  const mode = rawMode === 'signup' ? 'signup' : rawMode === 'forgot' ? 'forgot' : 'signin';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [code, setCode] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  function switchMode(next: string) {
    setError('');
    setInfo('');
    setShowReset(false);
    setPassword('');
    setConfirmPassword('');
    setSearchParams({ mode: next });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        await api.register({ username, email, password, confirmPassword, terms });
        setPassword('');
        setConfirmPassword('');
        setSearchParams({ mode: 'signin' });
        setInfo('Account created. Please sign in.');
      } else if (mode === 'forgot') {
        if (!showReset) {
          const result = await api.forgotPassword(email);
          setShowReset(true);
          setInfo(`Your verification code is ${result.code}. Enter it with your new password.`);
        } else {
          await api.resetPassword({ email, code, password });
          setShowReset(false);
          setPassword('');
          setCode('');
          setSearchParams({ mode: 'signin' });
          setInfo('Password updated. Please sign in with your new password.');
        }
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

  const heading =
    mode === 'signup' ? 'Create an account' : mode === 'forgot' ? 'Reset password' : 'Sign in';

  return (
    <section className="panel narrow">
      <h1>{heading}</h1>
      <p className="muted">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <a href="#signin" onClick={() => switchMode('signin')}>
              Sign in
            </a>
          </>
        ) : mode === 'forgot' ? (
          <>
            Remember your password?{' '}
            <a href="#signin" onClick={() => switchMode('signin')}>
              Sign in
            </a>
          </>
        ) : (
          <>
            New here?{' '}
            <a href="#signup" onClick={() => switchMode('signup')}>
              Create an account
            </a>
            {' · '}
            <a href="#forgot" onClick={() => switchMode('forgot')}>
              Forgot password?
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
          <label htmlFor="gh-email">
            {mode === 'signup' ? 'Email' : mode === 'forgot' ? 'Email address' : 'Username or email'}
          </label>
          <input
            id="gh-email"
            type="text"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        {mode !== 'forgot' && (
          <div className="field">
            <label htmlFor="gh-password">{mode === 'signup' ? 'Password' : 'Password'}</label>
            <input
              id="gh-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>
        )}
        {mode === 'forgot' && showReset && (
          <>
            <div className="field">
              <label htmlFor="gh-new-password">New password</label>
              <input
                id="gh-new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label htmlFor="gh-code">Verification code</label>
              <input
                id="gh-code"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
          </>
        )}
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
          {mode === 'signup'
            ? 'Create account'
            : mode === 'forgot'
              ? showReset
                ? 'Reset password'
                : 'Send verification code'
              : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
