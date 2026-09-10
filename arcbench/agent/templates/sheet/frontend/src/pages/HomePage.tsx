import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { WorkbookSummary } from '../api';
import * as api from '../api';

export default function HomePage() {
  const [workbooks, setWorkbooks] = useState<WorkbookSummary[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function refresh() {
    try {
      setWorkbooks(await api.listWorkbooks());
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const workbook = await api.createWorkbook(name || 'Untitled workbook');
      setName('');
      navigate(`/workbooks/${workbook.id}`);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  return (
    <section className="panel">
      <h1>Workbooks</h1>
      {error && <p className="error">{error}</p>}
      {workbooks.length === 0 ? (
        <p>No workbooks yet. Create one below.</p>
      ) : (
        <ul className="repo-list">
          {workbooks.map((workbook) => (
            <li key={workbook.id}>
              <Link to={`/workbooks/${workbook.id}`}>{workbook.name}</Link>
              <span className="muted"> · {workbook.worksheets.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
      <h2>New workbook</h2>
      <form className="inline-form" onSubmit={handleCreate}>
        <input
          aria-label="Workbook name"
          type="text"
          value={name}
          placeholder="Workbook name"
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit">Create workbook</button>
      </form>
    </section>
  );
}
