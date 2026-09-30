import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

// Placeholder surface. The generating agent replaces this file (and adds pages)
// with the task-specific application described by the requirements.
function Placeholder() {
  const [health, setHealth] = useState<string>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((payload) => setHealth(payload?.message || 'ok'))
      .catch(() => setHealth('unavailable'));
  }, []);

  return (
    <section className="panel">
      <h1>Application scaffold</h1>
      <p>Backend health: {health}</p>
      <p>This surface is generated from the task requirements.</p>
    </section>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="*" element={<Placeholder />} />
      </Routes>
    </div>
  );
}
