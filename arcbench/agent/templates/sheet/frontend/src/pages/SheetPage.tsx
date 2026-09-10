import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Cell, ValidationRule, WorkbookDetail, Worksheet } from '../api';
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

function colIndex(letters: string): number {
  let index = 0;
  for (const ch of letters.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index;
}

function refOf(col: number, row: number): string {
  return `${colLetter(col)}${row}`;
}

function parseRef(ref: string): { col: number; row: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!match) return null;
  return { col: colIndex(match[1]), row: Number(match[2]) };
}

function displayValue(cell: Cell | undefined): string {
  if (!cell) return '';
  if (cell.error) return String(cell.error);
  return cell.value === null || cell.value === undefined ? '' : String(cell.value);
}

function shiftFormula(formula: string, rowDelta: number, colDelta: number): string {
  return formula.replace(/([A-Z]+)(\d+)/g, (match, letters: string, digits: string) => {
    const col = colIndex(letters) + colDelta;
    const row = Number(digits) + rowDelta;
    if (col < 1 || row < 1) return '#REF!';
    return refOf(col, row);
  });
}

type Clipboard = {
  mode: 'copy' | 'cut';
  start: { col: number; row: number };
  cells: Record<string, Cell>;
} | null;

export default function SheetPage() {
  const { id = '' } = useParams();
  const [workbook, setWorkbook] = useState<WorkbookDetail | null>(null);
  const [active, setActive] = useState('');
  const [selected, setSelected] = useState('A1');
  const [anchor, setAnchor] = useState('A1');
  const [selection, setSelection] = useState<string[]>(['A1']);
  const [editValue, setEditValue] = useState('');
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOp, setFilterOp] = useState('contains');
  const [filterValue, setFilterValue] = useState('');
  const [appliedFilter, setAppliedFilter] = useState<{ column: string; op: string; value: string } | null>(null);
  const [listValues, setListValues] = useState('');
  const [numberMin, setNumberMin] = useState('0');
  const [numberMax, setNumberMax] = useState('100');
  const [pivotRow, setPivotRow] = useState('A');
  const [pivotCol, setPivotCol] = useState('B');
  const [pivotValue, setPivotValue] = useState('C');
  const [pivotAgg, setPivotAgg] = useState<'sum' | 'count'>('sum');
  const [pivotTarget, setPivotTarget] = useState('Pivot');
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
      setActive((current) =>
        current && detail.sheets.some((sheet) => sheet.name === current)
          ? current
          : detail.sheets[0]?.name || '',
      );
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

  function selectCell(ref: string, extend: boolean) {
    if (extend) {
      const a = parseRef(anchor);
      const b = parseRef(ref);
      if (a && b) {
        const refs: string[] = [];
        for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1) {
          for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col += 1) {
            refs.push(refOf(col, row));
          }
        }
        setSelection(refs);
        setSelected(ref);
        return;
      }
    }
    setAnchor(ref);
    setSelection([ref]);
    setSelected(ref);
  }

  function validationFor(ref: string): ValidationRule | null {
    return sheet?.validations?.[ref] || null;
  }

  async function commitCell(forcedValue?: string, refOverride?: string) {
    if (!sheet) return;
    const targetRef = refOverride || selected;
    const value = forcedValue !== undefined ? forcedValue : editRef.current;
    const cell = sheet.cells[targetRef];
    const current = cell?.formula || (cell ? displayValue(cell) : '');
    if (forcedValue === undefined && value === current) return;
    const rule = validationFor(targetRef);
    if (rule?.type === 'number' && value !== '') {
      const numeric = Number(value);
      if (Number.isNaN(numeric) || numeric < rule.min || numeric > rule.max) {
        setError(`Value must be a number between ${rule.min} and ${rule.max}.`);
        return;
      }
    }
    pushHistory();
    let update: Cell | null;
    if (value === '') update = null;
    else if (value.startsWith('=')) update = { value: 0, formula: value };
    else {
      const numeric = Number(value);
      update = { value: Number.isNaN(numeric) ? value : numeric };
    }
    await run(() => api.updateCells(id, sheet.name, { [targetRef]: update }), 'Saved.');
  }

  function copySelection(mode: 'copy' | 'cut') {
    if (!sheet) return;
    const cells: Record<string, Cell> = {};
    for (const ref of selection) {
      const cell = sheet.cells[ref];
      if (cell) cells[ref] = JSON.parse(JSON.stringify(cell));
    }
    const start = parseRef(selection[0] || selected) || { col: 1, row: 1 };
    setClipboard({ mode, start, cells });
    setInfo(mode === 'copy' ? 'Copied selection.' : 'Cut selection.');
  }

  async function pasteSelection() {
    if (!sheet || !clipboard) return;
    const target = parseRef(selected);
    if (!target) return;
    const updates: Record<string, Cell | null> = {};
    for (const [ref, cell] of Object.entries(clipboard.cells)) {
      const source = parseRef(ref);
      if (!source) continue;
      const rowDelta = target.row - clipboard.start.row;
      const colDelta = target.col - clipboard.start.col;
      const dest = refOf(source.col + colDelta, source.row + rowDelta);
      const next: Cell = { ...cell };
      if (cell.formula) next.formula = shiftFormula(cell.formula, rowDelta, colDelta);
      updates[dest] = next;
    }
    if (clipboard.mode === 'cut') {
      for (const ref of Object.keys(clipboard.cells)) updates[ref] = null;
      setClipboard(null);
    }
    pushHistory();
    await run(() => api.updateCells(id, sheet.name, updates), 'Pasted.');
  }

  async function applyListValidation() {
    if (!sheet) return;
    const values = listValues.split(',').map((value) => value.trim()).filter(Boolean);
    if (!values.length) {
      setError('Provide at least one list value.');
      return;
    }
    const range =
      selection.length > 1 ? `${selection[0]}:${selection[selection.length - 1]}` : selection[0];
    try {
      await api.setValidations(id, sheet.name, range, { type: 'list', values });
      setInfo('List validation applied.');
      await load();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function applyNumberValidation() {
    if (!sheet) return;
    const range =
      selection.length > 1 ? `${selection[0]}:${selection[selection.length - 1]}` : selection[0];
    try {
      await api.setValidations(id, sheet.name, range, {
        type: 'number',
        min: Number(numberMin),
        max: Number(numberMax),
      });
      setInfo('Number validation applied.');
      await load();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function createPivotTable() {
    if (!sheet) return;
    try {
      const result = await api.createPivot(id, {
        source: sheet.name,
        rowField: pivotRow,
        colField: pivotCol,
        valueField: pivotValue,
        agg: pivotAgg,
        target: pivotTarget,
      });
      setInfo('Pivot table created.');
      await load();
      setActive(result.sheet.name);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
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

  const visibleRows = useMemo(() => {
    const rows = Array.from({ length: ROWS }, (_, index) => index + 1);
    if (!appliedFilter || !sheet) return rows;
    const column = colIndex(appliedFilter.column || 'A');
    const expected = appliedFilter.value;
    return rows.filter((row) => {
      const value = displayValue(sheet.cells[refOf(column, row)]).toLowerCase();
      switch (appliedFilter.op) {
        case 'eq':
          return value === expected.toLowerCase();
        case 'gt':
          return Number(value) > Number(expected);
        case 'lt':
          return Number(value) < Number(expected);
        default:
          return value.includes(expected.toLowerCase());
      }
    });
  }, [appliedFilter, sheet]);

  if (!workbook || !sheet) {
    return (
      <section className="panel">
        <h1>Workbook</h1>
        {error && <p className="error">{error}</p>}
        <p>Loading…</p>
      </section>
    );
  }

  const selectedParsed = parseRef(selected) || { col: 1, row: 1 };

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
        <button type="button" onClick={() => commitCell()}>
          Save cell
        </button>
        <button type="button" onClick={() => copySelection('copy')}>
          Copy
        </button>
        <button type="button" onClick={() => copySelection('cut')}>
          Cut
        </button>
        <button type="button" disabled={!clipboard} onClick={pasteSelection}>
          Paste
        </button>
        <button type="button" onClick={handleUndo}>
          Undo
        </button>
        <button type="button" onClick={handleRedo}>
          Redo
        </button>
      </div>

      <div className="toolbar">
        <button
          type="button"
          onClick={() => run(() => api.insertRows(id, sheet.name, selectedParsed.row, 1, 'insert'), 'Row inserted.')}
        >
          Insert row
        </button>
        <button
          type="button"
          onClick={() => run(() => api.insertRows(id, sheet.name, selectedParsed.row, 1, 'delete'), 'Row deleted.')}
        >
          Delete row
        </button>
        <button
          type="button"
          onClick={() => run(() => api.insertColumns(id, sheet.name, selectedParsed.col, 1, 'insert'), 'Column inserted.')}
        >
          Insert column
        </button>
        <button
          type="button"
          onClick={() => run(() => api.insertColumns(id, sheet.name, selectedParsed.col, 1, 'delete'), 'Column deleted.')}
        >
          Delete column
        </button>
        <button
          type="button"
          onClick={() => run(() => api.sortSheet(id, sheet.name, colLetter(selectedParsed.col), 'asc'), 'Sorted ascending.')}
        >
          Sort column ↑
        </button>
        <button
          type="button"
          onClick={() => run(() => api.sortSheet(id, sheet.name, colLetter(selectedParsed.col), 'desc'), 'Sorted descending.')}
        >
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
            {visibleRows.map((rowNumber) => (
              <tr key={rowNumber}>
                <th>{rowNumber}</th>
                {Array.from({ length: COLS }, (_, colIndexValue) => {
                  const ref = refOf(colIndexValue + 1, rowNumber);
                  const cell = sheet.cells[ref];
                  const rule = validationFor(ref);
                  if (rule?.type === 'list') {
                    return (
                      <td key={ref}>
                        <select
                          aria-label={`Cell ${ref}`}
                          value={displayValue(cell)}
                          onFocus={() => selectCell(ref, false)}
                          onChange={(event) => {
                            selectCell(ref, false);
                            commitCell(event.target.value, ref);
                          }}
                        >
                          <option value="">(empty)</option>
                          {rule.values.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }
                  return (
                    <td key={ref}>
                      <input
                        aria-label={`Cell ${ref}`}
                        className={selection.includes(ref) ? 'selected' : ''}
                        type={rule?.type === 'number' ? 'number' : 'text'}
                        value={selected === ref ? editValue : displayValue(cell)}
                        onFocus={(event) => selectCell(ref, event.shiftKey)}
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
          onClick={() =>
            run(
              () => api.addWorksheet(id, newSheetName || `Sheet${workbook.sheets.length + 1}`),
              'Worksheet added.',
            ).then(load)
          }
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
        <button
          type="button"
          onClick={() => run(() => api.deleteWorksheet(id, active), 'Worksheet deleted.').then(load)}
        >
          Delete worksheet
        </button>
      </div>

      <h2>Validation</h2>
      <div className="toolbar">
        <input
          aria-label="List validation values"
          type="text"
          value={listValues}
          placeholder="open,closed,pending"
          onChange={(event) => setListValues(event.target.value)}
        />
        <button type="button" onClick={applyListValidation}>
          Apply list validation
        </button>
        <input
          aria-label="Validation minimum"
          type="number"
          value={numberMin}
          onChange={(event) => setNumberMin(event.target.value)}
        />
        <input
          aria-label="Validation maximum"
          type="number"
          value={numberMax}
          onChange={(event) => setNumberMax(event.target.value)}
        />
        <button type="button" onClick={applyNumberValidation}>
          Apply number validation
        </button>
      </div>

      <h2>Filter</h2>
      <div className="toolbar">
        <input
          aria-label="Filter column"
          type="text"
          value={filterColumn}
          placeholder="A"
          onChange={(event) => setFilterColumn(event.target.value.toUpperCase())}
        />
        <select aria-label="Filter operator" value={filterOp} onChange={(event) => setFilterOp(event.target.value)}>
          <option value="contains">contains</option>
          <option value="eq">equals</option>
          <option value="gt">greater than</option>
          <option value="lt">less than</option>
        </select>
        <input
          aria-label="Filter value"
          type="text"
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
        />
        <button type="button" onClick={() => setAppliedFilter({ column: filterColumn || 'A', op: filterOp, value: filterValue })}>
          Apply filter
        </button>
        <button type="button" onClick={() => setAppliedFilter(null)}>
          Clear filter
        </button>
      </div>

      <h2>Pivot table</h2>
      <div className="toolbar">
        <input aria-label="Pivot row field" type="text" value={pivotRow} onChange={(event) => setPivotRow(event.target.value)} />
        <input aria-label="Pivot column field" type="text" value={pivotCol} onChange={(event) => setPivotCol(event.target.value)} />
        <input aria-label="Pivot value field" type="text" value={pivotValue} onChange={(event) => setPivotValue(event.target.value)} />
        <select aria-label="Pivot aggregation" value={pivotAgg} onChange={(event) => setPivotAgg(event.target.value as 'sum' | 'count')}>
          <option value="sum">sum</option>
          <option value="count">count</option>
        </select>
        <input aria-label="Pivot target" type="text" value={pivotTarget} onChange={(event) => setPivotTarget(event.target.value)} />
        <button type="button" onClick={createPivotTable}>
          Create pivot table
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
