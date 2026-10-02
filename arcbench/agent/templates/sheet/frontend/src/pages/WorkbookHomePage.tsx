import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type WorkbookSummary } from '../api';

// REQ-1-1-1 view and open a workbook, REQ-1-2-1 create a blank workbook,
// REQ-1-2-2 rename a workbook, REQ-1-3-1 import CSV to create a workbook.
function WorkbookHomePage() {
  const navigate = useNavigate();
  const [workbooks, setWorkbooks] = useState<WorkbookSummary[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<WorkbookSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [importName, setImportName] = useState('');
  const [importText, setImportText] = useState('');

  const load = useCallback(async () => {
    try {
      const payload = await api.listWorkbooks();
      setWorkbooks(payload.workbooks || []);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createBlank() {
    try {
      const payload = await api.createWorkbook(newName);
      setCreating(false);
      setNewName('');
      setError('');
      setNote(`Created workbook ${payload.workbook.name}`);
      await load();
      navigate(`/workbooks/${payload.workbook.id}`);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function renameWorkbook() {
    if (!renaming) return;
    try {
      await api.renameWorkbook(renaming.id, renameValue);
      setRenaming(null);
      setRenameValue('');
      setError('');
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function confirmImport() {
    try {
      const payload = await api.importCsv(importName || 'Imported workbook', importText);
      setImporting(false);
      setImportText('');
      setImportName('');
      setError('');
      await load();
      navigate(`/workbooks/${payload.workbook.id}`);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function onCsvPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    setImportName(file.name.replace(/\.csv$/i, '') || 'Imported workbook');
  }

  return (
    <section>
      <h1>Workbooks</h1>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {note ? <p className="note">{note}</p> : null}
      <div className="toolbar">
        <button type="button" onClick={() => { setCreating(true); setNewName(''); }}>
          New blank workbook
        </button>
        <button type="button" onClick={() => { setImporting(true); setImportText(''); }}>
          Import CSV
        </button>
      </div>
      <ul className="workbook-list">
        {workbooks.map((workbook) => (
          <li key={workbook.id}>
            <Link to={`/workbooks/${workbook.id}`}>{workbook.name}</Link>
            <span>Last updated: {workbook.lastUpdated || 'Q3'}</span>
            <button
              type="button"
              onClick={() => { setRenaming(workbook); setRenameValue(workbook.name); }}
            >
              Rename workbook
            </button>
          </li>
        ))}
        {!workbooks.length ? <li>No workbooks yet.</li> : null}
      </ul>

      {creating ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="New blank workbook">
            <h2>New blank workbook</h2>
            <label>
              Workbook name
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                autoFocus
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={createBlank}>Create</button>
              <button type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {renaming ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Rename workbook">
            <h2>Rename workbook</h2>
            <label>
              Workbook name
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                autoFocus
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={renameWorkbook}>Save</button>
              <button type="button" onClick={() => setRenaming(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {importing ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Import CSV">
            <h2>Import CSV</h2>
            <label>
              CSV file
              <input type="file" accept=".csv,text/csv" onChange={onCsvPicked} />
            </label>
            <label>
              Workbook name
              <input
                value={importName}
                onChange={(event) => setImportName(event.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={confirmImport}>Confirm import</button>
              <button type="button" onClick={() => setImporting(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default WorkbookHomePage;
