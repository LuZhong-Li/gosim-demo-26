import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '../api';
import * as api from '../api';

type FieldErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

function fieldErrorsFrom(caught: unknown): FieldErrors | null {
  const payload = (caught as { response?: { data?: { errors?: FieldErrors } } })?.response?.data;
  return payload && payload.errors ? payload.errors : null;
}

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
  const [resetCode, setResetCode] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  function switchMode(next: string) {
    setError('');
    setInfo('');
    setFieldErrors({});
    setShowReset(false);
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setResetCode('');
    setSearchParams({ mode: next });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
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
          setResetCode(result.code);
          setShowReset(true);
          setInfo('');
        } else {
          await api.resetPassword({ email, code, password, confirmPassword });
          setShowReset(false);
          setPassword('');
          setConfirmPassword('');
          setCode('');
          setResetCode('');
          setSearchParams({ mode: 'signin' });
          setInfo('Password updated');
        }
      } else {
        const result = await api.login(email || username, password);
        api.tokenStore.set(result.token);
        onAuth(result.user);
        navigate('/');
      }
    } catch (caught) {
      const fields = fieldErrorsFrom(caught);
      if (fields) {
        setFieldErrors(fields);
      } else {
        setError(api.errorMessage(caught));
      }
    } finally {
      setBusy(false);
    }
  }

  const heading =
    mode === 'signup' ? 'Create an account' : mode === 'forgot' ? 'Reset password' : 'Sign in';

  const emailLabel = mode === 'signup' ? 'Email' : mode === 'forgot' ? 'Email' : 'Username or email';

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
              Forgot password
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
      {mode === 'forgot' && showReset && resetCode && (
        <p className="muted" role="status">
          Verification code: <span className="code">{resetCode}</span>
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
            {fieldErrors.username && <p className="error">{fieldErrors.username}</p>}
          </div>
        )}
        {mode !== 'forgot' || !showReset ? (
          <div className="field">
            <label htmlFor="gh-email">{emailLabel}</label>
            <input
              id="gh-email"
              type="text"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && <p className="error">{fieldErrors.email}</p>}
          </div>
        ) : null}
        {mode === 'forgot' && showReset && (
          <div className="field">
            <label htmlFor="gh-code">Verification code</label>
            <input
              id="gh-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
        )}
        {mode !== 'forgot' && (
          <div className="field">
            <label htmlFor="gh-password">Password</label>
            <input
              id="gh-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {fieldErrors.password && <p className="error">{fieldErrors.password}</p>}
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
              <label htmlFor="gh-confirm">Confirm password</label>
              <input
                id="gh-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
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
            {fieldErrors.confirmPassword && <p className="error">{fieldErrors.confirmPassword}</p>}
          </div>
        )}
        {mode === 'signup' && (
          <label className="check">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
            />
            Agree to the terms
          </label>
        )}
        {mode === 'signup' && fieldErrors.terms && <p className="error">{fieldErrors.terms}</p>}
        <button type="submit" disabled={busy}>
          {mode === 'signup'
            ? 'Create account'
            : mode === 'forgot'
              ? showReset
                ? 'Reset password'
                : 'Send reset link'
              : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
