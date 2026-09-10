import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Cell, WorkbookDetail, Worksheet } from '../api';
import * as api from '../api';

const ROWS = 30;
const COLS = 12;

function colLetter(index: number): string {
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function refOf(col: number, row: number): string {
  return `${colLetter(col)}${row}`;
}

function displayValue(cell: Cell | undefined): string {
  if (!cell) return '';
  if (cell.error) return String(cell.error);
  return cell.value === null || cell.value === undefined ? '' : String(cell.value);
}

export default function SheetPage() {
  const { id = '' } = useParams();
  const [workbook, setWorkbook] = useState<WorkbookDetail | null>(null);
  const [active, setActive] = useState('');
  const [selected, setSelected] = useState('A1');
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [importText, setImportText] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const undoStack = useRef<{ sheet: string; cells: Record<string, Cell> }[]>([]);
  const redoStack = useRef<{ sheet: string; cells: Record<string, Cell> }[]>([]);
  const editRef = useRef('');

  const load = useCallback(async () => {
    try {
      const detail = await api.getWorkbook(id);
      setWorkbook(detail);
      setActive((current) => (current && detail.sheets.some((sheet) => sheet.name === current)
        ? current
        : detail.sheets[0]?.name || ''));
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const sheet: Worksheet | null = useMemo(
    () => workbook?.sheets.find((item) => item.name === active) || null,
    [workbook, active],
  );

  useEffect(() => {
    const cell = sheet?.cells[selected];
    const next = cell?.formula || (cell ? displayValue(cell) : '');
    editRef.current = next;
    setEditValue(next);
  }, [sheet, selected]);

  function applySheetResult(result: Worksheet) {
    setWorkbook((current) =>
      current
        ? {
            ...current,
            sheets: current.sheets.map((item) => (item.name === result.name ? result : item)),
          }
        : current,
    );
  }

  function pushHistory() {
    if (!sheet) return;
    undoStack.current.push({ sheet: sheet.name, cells: JSON.parse(JSON.stringify(sheet.cells)) });
    redoStack.current = [];
  }

  async function run(action: () => Promise<Worksheet | void>, successMessage?: string) {
    setError('');
    if (successMessage) setInfo('');
    try {
      const result = await action();
      if (result) applySheetResult(result as Worksheet);
      if (successMessage) setInfo(successMessage);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function commitCell() {
    if (!sheet) return;
    const value = editRef.current;
    const cell = sheet.cells[selected];
    const current = cell?.formula || (cell ? displayValue(cell) : '');
    if (value === current) return;
    pushHistory();
    let update: Cell | null;
    if (value === '') update = null;
    else if (value.startsWith('=')) {
      update = { value: 0, formula: value };
    } else {
      const numeric = Number(value);
      update = { value: Number.isNaN(numeric) ? value : numeric };
    }
    await run(() => api.updateCells(id, sheet.name, { [selected]: update }), 'Saved.');
  }

  async function handleUndo() {
    const snapshot = undoStack.current.pop();
    if (!snapshot || !sheet) return;
    redoStack.current.push({ sheet: sheet.name, cells: JSON.parse(JSON.stringify(sheet.cells)) });
    await run(() => api.replaceCells(id, snapshot.sheet, snapshot.cells), 'Undo.');
    setActive(snapshot.sheet);
  }

  async function handleRedo() {
    const snapshot = redoStack.current.pop();
    if (!snapshot || !sheet) return;
    undoStack.current.push({ sheet: sheet.name, cells: JSON.parse(JSON.stringify(sheet.cells)) });
    await run(() => api.replaceCells(id, snapshot.sheet, snapshot.cells), 'Redo.');
    setActive(snapshot.sheet);
  }

  if (!workbook || !sheet) {
    return (
      <section className="panel">
        <h1>Workbook</h1>
        {error && <p className="error">{error}</p>}
        <p>Loading…</p>
      </section>
    );
  }

  const selectedParsed = /^([A-Z]+)(\d+)$/.exec(selected);
  const selectedCol = selectedParsed ? selectedParsed[1] : 'A';
  const selectedRow = selectedParsed ? Number(selectedParsed[2]) : 1;

  return (
    <section className="panel wide">
      <h1>{workbook.name}</h1>
      <p className="muted">
        <Link to="/">← All workbooks</Link>
      </p>
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}

      <div className="toolbar">
        <span className="cell-badge">{selected}</span>
        <input
          aria-label="Formula bar"
          className="formula-bar"
          value={editValue}
          onChange={(event) => {
            editRef.current = event.target.value;
            setEditValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitCell();
            }
          }}
        />
        <button type="button" onClick={commitCell}>
          Save cell
        </button>
        <button type="button" onClick={handleUndo}>
          Undo
        </button>
        <button type="button" onClick={handleRedo}>
          Redo
        </button>
      </div>

      <div className="toolbar">
        <button type="button" onClick={() => run(() => api.insertRows(id, sheet.name, selectedRow, 1, 'insert'), 'Row inserted.')}>
          Insert row
        </button>
        <button type="button" onClick={() => run(() => api.insertRows(id, sheet.name, selectedRow, 1, 'delete'), 'Row deleted.')}>
          Delete row
        </button>
        <button
          type="button"
          onClick={() => run(() => api.insertColumns(id, sheet.name, selectedParsed ? colIndex(selectedParsed[1]) : 1, 1, 'insert'), 'Column inserted.')}
        >
          Insert column
        </button>
        <button
          type="button"
          onClick={() => run(() => api.insertColumns(id, sheet.name, selectedParsed ? colIndex(selectedParsed[1]) : 1, 1, 'delete'), 'Column deleted.')}
        >
          Delete column
        </button>
        <button type="button" onClick={() => run(() => api.sortSheet(id, sheet.name, selectedCol, 'asc'), 'Sorted ascending.')}>
          Sort column ↑
        </button>
        <button type="button" onClick={() => run(() => api.sortSheet(id, sheet.name, selectedCol, 'desc'), 'Sorted descending.')}>
          Sort column ↓
        </button>
        <a className="button-link" href={api.exportUrl(id, sheet.name)}>
          Export CSV
        </a>
      </div>

      <div className="grid-wrap">
        <table className="sheet-grid">
          <thead>
            <tr>
              <th />
              {Array.from({ length: COLS }, (_, index) => (
                <th key={index}>{colLetter(index + 1)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, rowIndex) => (
              <tr key={rowIndex}>
                <th>{rowIndex + 1}</th>
                {Array.from({ length: COLS }, (_, colIndex) => {
                  const ref = refOf(colIndex + 1, rowIndex + 1);
                  const cell = sheet.cells[ref];
                  return (
                    <td key={ref}>
                      <input
                        aria-label={`Cell ${ref}`}
                        className={selected === ref ? 'selected' : ''}
                        value={selected === ref ? editValue : displayValue(cell)}
                        onFocus={() => {
                          editRef.current = cell?.formula || displayValue(cell);
                          setSelected(ref);
                        }}
                        onChange={(event) => {
                          setSelected(ref);
                          editRef.current = event.target.value;
                          setEditValue(event.target.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitCell();
                          }
                        }}
                        onBlur={() => {
                          if (selected === ref) commitCell();
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="toolbar">
        {workbook.sheets.map((item) => (
          <button
            key={item.name}
            type="button"
            className={item.name === active ? 'active' : ''}
            onClick={() => setActive(item.name)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input
          aria-label="New worksheet name"
          type="text"
          value={newSheetName}
          placeholder="New worksheet"
          onChange={(event) => setNewSheetName(event.target.value)}
        />
        <button
          type="button"
          onClick={() => run(() => api.addWorksheet(id, newSheetName || `Sheet${workbook.sheets.length + 1}`), 'Worksheet added.').then(load)}
        >
          Add worksheet
        </button>
        <input
          aria-label="Rename worksheet"
          type="text"
          value={renameValue}
          placeholder={`Rename ${active}`}
          onChange={(event) => setRenameValue(event.target.value)}
        />
        <button
          type="button"
          onClick={() => run(() => api.renameWorksheet(id, active, renameValue), 'Worksheet renamed.').then(load)}
        >
          Rename worksheet
        </button>
        <button type="button" onClick={() => run(() => api.deleteWorksheet(id, active), 'Worksheet deleted.').then(load)}>
          Delete worksheet
        </button>
      </div>

      <h2>Import CSV</h2>
      <textarea
        aria-label="CSV import"
        rows={4}
        value={importText}
        onChange={(event) => setImportText(event.target.value)}
      />
      <button
        type="button"
        onClick={() => run(() => api.importCsv(id, sheet.name, importText), 'CSV imported.')}
      >
        Import into {active}
      </button>
    </section>
  );
}

function colIndex(letters: string): number {
  let index = 0;
  for (const ch of letters.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index;
}
