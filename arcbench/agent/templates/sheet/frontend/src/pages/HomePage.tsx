import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { WorkbookSummary } from '../api';
import * as api from '../api';

export default function HomePage() {
  const [workbooks, setWorkbooks] = useState<WorkbookSummary[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvReady, setCsvReady] = useState<{ name: string; text: string } | null>(null);
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

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvReady({
        name: file.name.replace(/\.csv$/i, '') || 'Untitled workbook',
        text: String(reader.result || ''),
      });
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csvReady) return;
    setCsvError('');
    try {
      const workbook = await api.importCsvFile(csvReady.name, csvReady.text);
      setCsvDialogOpen(false);
      setCsvReady(null);
      navigate(`/workbooks/${workbook.id}`);
    } catch (caught) {
      setCsvError(api.errorMessage(caught, 'Invalid CSV file format. Import failed.'));
    }
  }

  return (
    <section className="panel">
      <h1>Workbooks</h1>
      {error && <p className="error">{error}</p>}
      <div className="toolbar">
        <button type="button" onClick={() => navigate('/workbooks/new')}>
          New blank workbook
        </button>
      </div>
      {workbooks.length === 0 ? (
        <p>No workbooks yet. Create one below.</p>
      ) : (
        <ul className="repo-list">
          {workbooks.map((workbook) => (
            <li key={workbook.id}>
              <Link to={`/workbooks/${workbook.id}`}>{workbook.name}</Link>
              <span className="muted"> · {workbook.worksheets.join(', ')} · Last updated: {new Date(workbook.updatedAt || workbook.createdAt).toLocaleString()}</span>
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
      <h2>Import CSV</h2>
      <button type="button" onClick={() => setCsvDialogOpen(true)}>
        Import CSV
      </button>
      {csvDialogOpen && (
        <div role="dialog" aria-label="Import CSV" className="panel">
          <h3>Import CSV</h3>
          {csvError && <p className="error">{csvError}</p>}
          <label>
            CSV file
            <input
              aria-label="CSV file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
            />
          </label>
          <div className="toolbar">
            <button type="button" onClick={handleImport} disabled={!csvReady}>
              Confirm import
            </button>
            <button type="button" onClick={() => setCsvDialogOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function NewWorkbookPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const workbook = await api.createWorkbook(name.trim() || 'Untitled workbook');
      navigate(`/workbooks/${workbook.id}`);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  return (
    <section className="panel">
      <h1>New blank workbook</h1>
      {error && <p className="error">{error}</p>}
      <form className="form-grid" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="new-workbook-name">Workbook name</label>
          <input
            id="new-workbook-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <button type="submit">Create</button>
      </form>
    </section>
  );
}

