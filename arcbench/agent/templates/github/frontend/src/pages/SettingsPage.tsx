import { useState } from 'react';
import * as api from '../api';

// REQ-1-3 Change Account Password
export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  return (
    <>
      <h2>Settings</h2>
      <h3>Password and authentication</h3>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          setInfo('');
          api
            .changePassword({ currentPassword, newPassword, confirmPassword })
            .then(() => {
              setInfo('Password updated.');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            })
            .catch((caught) => setError(api.errorMessage(caught)));
        }}
      >
        <div className="field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        <button type="submit">Update password</button>
      </form>
    </>
  );
}
