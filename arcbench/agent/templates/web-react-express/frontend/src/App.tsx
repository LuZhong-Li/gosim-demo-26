import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import type { User } from './api';
import * as api from './api';
import BookingPage from './pages/BookingPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function Header({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <header className="app-header">
      <Link to="/" className="brand">
        Ticket Booking
      </Link>
      <nav>
        <Link to="/register">Register</Link>
        <Link to="/login">Login</Link>
        {user ? (
          <>
            <span className="username">{user.username}</span>
            <Link to="/" onClick={onLogout}>
              Sign out
            </Link>
          </>
        ) : null}
      </nav>
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
    try {
      setUser(api.me());
    } catch {
      api.tokenStore.clear();
    } finally {
      setReady(true);
    }
    return undefined;
  }, []);

  const handleAuth = useCallback((current: User) => {
    setUser(current);
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setUser(null);
    navigate('/');
  }, [navigate]);

  return (
    <div className="app-shell">
      <Header user={user} onLogout={handleLogout} />
      {!ready ? (
        <p className="loading">Loading…</p>
      ) : (
        <main className="page">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage onAuth={handleAuth} />} />
            <Route path="/login" element={<LoginPage onAuth={handleAuth} />} />
            <Route path="/booking" element={<BookingPage onAuth={handleAuth} />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

export default App;
