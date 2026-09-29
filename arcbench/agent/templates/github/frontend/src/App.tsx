import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import type { User } from './api';
import * as api from './api';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import OrgPage from './pages/OrgPage';
import OrgsPage from './pages/OrgsPage';
import RepoPage from './pages/RepoPage';
import SettingsPage from './pages/SettingsPage';

function Header({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <header className="app-header">
      <Link to="/" className="brand">
        GitHub Clone
      </Link>
      <nav>
        {user ? (
          <div className="account-menu">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              Account menu
            </button>
            {menuOpen && (
              <div className="account-menu-popover" role="menu">
                <span className="username">{user.username}</span>
                <Link to="/orgs" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Your organizations
                </Link>
                <Link to="/settings" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <a
                  href="#signout"
                  role="menuitem"
                  onClick={(event) => {
                    event.preventDefault();
                    setMenuOpen(false);
                    setConfirmingSignOut(true);
                  }}
                >
                  Sign out
                </a>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/auth?mode=signin">Sign in</Link>
            <Link to="/auth?mode=signup">Sign up</Link>
          </>
        )}
      </nav>

      {confirmingSignOut && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Sign out">
            <p>Sign out of this browser session only?</p>
            <button
              type="button"
              onClick={() => {
                setConfirmingSignOut(false);
                onLogout();
              }}
            >
              Confirm sign out
            </button>
            <button type="button" onClick={() => setConfirmingSignOut(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!api.tokenStore.get()) {
      setReady(true);
      return undefined;
    }
    api
      .me()
      .then((current) => setUser(current))
      .catch(() => api.tokenStore.clear())
      .finally(() => setReady(true));
    return undefined;
  }, []);

  const handleAuth = useCallback((current: User) => setUser(current), []);

  const handleLogout = useCallback(() => {
    api
      .logout()
      .catch(() => undefined)
      .finally(() => {
        api.tokenStore.clear();
        setUser(null);
        navigate('/');
      });
  }, [navigate]);

  return (
    <div className="app-shell">
      <Header user={user} onLogout={handleLogout} />
      {!ready ? (
        <p className="loading">Loading…</p>
      ) : (
        <main className="page">
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/auth" element={<AuthPage user={user} onAuth={handleAuth} />} />
            <Route path="/orgs" element={<OrgsPage />} />
            <Route path="/orgs/:name" element={<OrgPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/:owner/:name" element={<RepoPage />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

export default App;
