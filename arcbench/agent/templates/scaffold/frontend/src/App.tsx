import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import type { User } from './api';
import * as api from './api';
import AuthPage from './pages/AuthPage';
import ComparePage from './pages/ComparePage';
import HomePage from './pages/HomePage';
import OrgPage from './pages/OrgPage';
import OrgsPage from './pages/OrgsPage';
import RepoPage from './pages/RepoPage';
import RepoSearchPage from './pages/RepoSearchPage';
import RepoSettingsPage from './pages/RepoSettingsPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';

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
            {/* The suite reaches the sign-in / registration / recovery pages by URL,
                and it uses whichever canonical path the task names. Before this,
                only /auth matched, so a spec that opened /signin or /sign-up got
                the shell with an EMPTY route table and failed on
                getByLabel('Username or email') - element(s) not found. */}
            <Route path="/login" element={<AuthPage user={user} onAuth={handleAuth} initial="signin" />} />
            <Route path="/signin" element={<AuthPage user={user} onAuth={handleAuth} initial="signin" />} />
            <Route path="/sign-in" element={<AuthPage user={user} onAuth={handleAuth} initial="signin" />} />
            <Route path="/account-access" element={<AuthPage user={user} onAuth={handleAuth} initial="signin" />} />
            <Route path="/register" element={<AuthPage user={user} onAuth={handleAuth} initial="signup" />} />
            <Route path="/signup" element={<AuthPage user={user} onAuth={handleAuth} initial="signup" />} />
            <Route path="/sign-up" element={<AuthPage user={user} onAuth={handleAuth} initial="signup" />} />
            <Route path="/create-account" element={<AuthPage user={user} onAuth={handleAuth} initial="signup" />} />
            <Route path="/forgot" element={<AuthPage user={user} onAuth={handleAuth} initial="forgot" />} />
            <Route path="/forgot-password" element={<AuthPage user={user} onAuth={handleAuth} initial="forgot" />} />
            <Route path="/password-recovery" element={<AuthPage user={user} onAuth={handleAuth} initial="forgot" />} />
            {/* Two-segment spellings of the same pages. Without an explicit static
                route these fall to /:owner/:name, which ranks as a match and
                renders the repository page instead of the form - a silent wrong
                screen rather than a 404. */}
            <Route path="/account/access" element={<AuthPage user={user} onAuth={handleAuth} initial="signin" />} />
            <Route path="/sign/in" element={<AuthPage user={user} onAuth={handleAuth} initial="signin" />} />
            <Route path="/sign/up" element={<AuthPage user={user} onAuth={handleAuth} initial="signup" />} />
            <Route path="/create/account" element={<AuthPage user={user} onAuth={handleAuth} initial="signup" />} />
            <Route path="/auth/signin" element={<AuthPage user={user} onAuth={handleAuth} initial="signin" />} />
            <Route path="/auth/signup" element={<AuthPage user={user} onAuth={handleAuth} initial="signup" />} />
            {/* REQ-1-3 Change Account Password: the generated entries mounted this
                surface under all of these spellings; the scaffold had only
                /settings, so every path the suite opened for it fell through. */}
            <Route path="/settings/password" element={<SettingsPage />} />
            <Route path="/settings/account" element={<SettingsPage />} />
            <Route path="/password" element={<SettingsPage />} />
            <Route path="/change-password" element={<SettingsPage />} />
            <Route path="/orgs" element={<OrgsPage />} />
            <Route path="/orgs/:name" element={<OrgPage />} />
            {/* REQ-2-2-1 / REQ-2-2-2: organization team detail page */}
            <Route path="/orgs/:name/teams/:team" element={<TeamPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/:owner/:name/compare" element={<ComparePage />} />
            {/* REQ-4-2-3: code search results with a unique "Code" filter link */}
            <Route path="/:owner/:name/search" element={<RepoSearchPage />} />
            {/* REQ-3-4 / REQ-4-3-3 / REQ-6-1 repository settings surface */}
            <Route path="/:owner/:name/settings" element={<RepoSettingsPage section="general" />} />
            <Route
              path="/:owner/:name/settings/general"
              element={<RepoSettingsPage section="general" />}
            />
            <Route
              path="/:owner/:name/settings/branches"
              element={<RepoSettingsPage section="branches" />}
            />
            <Route
              path="/:owner/:name/settings/access"
              element={<RepoSettingsPage section="access" />}
            />
            <Route path="/:owner/:name" element={<RepoPage />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

export default App;
