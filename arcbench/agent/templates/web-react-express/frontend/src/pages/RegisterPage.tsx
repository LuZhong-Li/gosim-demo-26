import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../api';
import * as api from '../api';

const NATIONALITIES = [
  'Vietnam',
  'China',
  'United States',
  'Singapore',
  'Japan',
  'Malaysia',
];

export default function RegisterPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [form, setForm] = useState({
    nationality: 'Vietnam',
    name: '',
    passportNumber: '',
    passportExpirationDate: '',
    dateOfBirth: '',
    gender: 'Male',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    terms: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.register({ ...form, terms: form.terms === true });
      api.tokenStore.set(result.token);
      onAuth(result.user);
      navigate('/');
    } catch (caught) {
      setError(api.errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel narrow">
      <h1>Create your account</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="nationality">Nationality</label>
          <select
            id="nationality"
            value={form.nationality}
            onChange={(event) => update('nationality', event.target.value)}
          >
            {NATIONALITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="passport-number">Passport number</label>
          <input
            id="passport-number"
            type="text"
            value={form.passportNumber}
            onChange={(event) => update('passportNumber', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="passport-expiration-date">Passport expiration date</label>
          <input
            id="passport-expiration-date"
            type="date"
            value={form.passportExpirationDate}
            onChange={(event) => update('passportExpirationDate', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="date-of-birth">Date of birth</label>
          <input
            id="date-of-birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => update('dateOfBirth', event.target.value)}
          />
        </div>
        <fieldset className="field">
          <legend>Gender</legend>
          <label className="inline">
            <input
              type="radio"
              name="gender"
              value="Male"
              checked={form.gender === 'Male'}
              onChange={() => update('gender', 'Male')}
            />
            Male
          </label>
          <label className="inline">
            <input
              type="radio"
              name="gender"
              value="Female"
              checked={form.gender === 'Female'}
              onChange={() => update('gender', 'Female')}
            />
            Female
          </label>
        </fieldset>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="text"
            inputMode="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            value={form.confirmPassword}
            onChange={(event) => update('confirmPassword', event.target.value)}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.terms}
            onChange={(event) => update('terms', event.target.checked)}
          />
          I agree to the Terms of Service and Privacy Policy
        </label>
        <button type="submit" disabled={busy}>
          Next step
        </button>
      </form>
    </section>
  );
}
