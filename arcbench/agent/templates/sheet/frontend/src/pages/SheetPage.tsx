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

function refsBetween(startRef: string, endRef: string): string[] {
  const start = parseRef(startRef);
  const end = parseRef(endRef);
  if (!start || !end) return [startRef];
  const refs: string[] = [];
  for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row += 1) {
    for (let col = Math.min(start.col, end.col); col <= Math.max(start.col, end.col); col += 1) {
      refs.push(refOf(col, row));
    }
  }
  return refs;
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
  const [inlineEdit, setInlineEdit] = useState<{ ref: string; value: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaValue, setFormulaValue] = useState('');
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOp, setFilterOp] = useState('contains');
  const [filterValue, setFilterValue] = useState('');
  const [appliedFilter, setAppliedFilter] = useState<{ column: string; op: string; value: string } | null>(null);
  const [listValues, setListValues] = useState('');
  const [numberMin, setNumberMin] = useState('0');
  const [numberMax, setNumberMax] = useState('100');
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [openDropdownRef, setOpenDropdownRef] = useState<string | null>(null);
  const [pivotDialogOpen, setPivotDialogOpen] = useState(false);
  const [pivotDraft, setPivotDraft] = useState({
    rowField: '',
    colField: '',
    valueField: '',
    agg: 'SUM',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [importText, setImportText] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const undoStack = useRef<{ sheet: string; cells: Record<string, Cell> }[]>([]);
  const redoStack = useRef<{ sheet: string; cells: Record<string, Cell> }[]>([]);
  const editRef = useRef('');
  const formulaRef = useRef('');
  const dirtyRef = useRef(false);
  const syncedKeyRef = useRef('');
  const editingRefRef = useRef<string | null>(null);
  const draggingRef = useRef(false);
  const dragAnchorRef = useRef('A1');
  const dragFocusRef = useRef('A1');
  const inlineCancelledRef = useRef(false);
  const undoRedoRef = useRef({ undo: () => undefined, redo: () => undefined });
  const undoRedoQueueRef = useRef(Promise.resolve());
  const pendingWritesRef = useRef(Promise.resolve());
  const latestCellsRef = useRef<Record<string, Cell>>({});

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
    const gridText = cell ? displayValue(cell) : '';
    const barText = cell?.formula || gridText;
    if (editingRefRef.current === selected) {
      // A focused cell keeps the text the user is typing; only the formula bar
      // mirrors the stored definition until the cell is committed.
      formulaRef.current = barText;
      setFormulaValue(barText);
      return;
    }
    const syncKey = `${selected}|${cell ? JSON.stringify(cell) : ''}`;
    if (syncedKeyRef.current === syncKey) return;
    syncedKeyRef.current = syncKey;
    editRef.current = gridText;
    setEditValue(gridText);
    formulaRef.current = barText;
    setFormulaValue(barText);
  }, [sheet, selected]);

  useEffect(() => {
    if (!sheet) return;
    const saved = sheet.selection;
    if (saved && parseRef(saved.anchor) && parseRef(saved.focus)) {
      setAnchor(saved.anchor);
      setSelection(refsBetween(saved.anchor, saved.focus));
      setSelected(saved.focus);
      return;
    }
    setAnchor('A1');
    setSelection(['A1']);
    setSelected('A1');
    // Selection is restored only when the active worksheet changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sheet?.name]);

  const pivotSource: Worksheet | null = useMemo(() => {
    if (!sheet?.pivot) return null;
    return workbook?.sheets.find((item) => item.name === sheet.pivot?.source) || null;
  }, [sheet, workbook]);

  const pivotHeaders = useMemo(() => {
    if (!sheet?.pivot || !pivotSource) return [];
    const start = parseRef(sheet.pivot.range.start);
    const end = parseRef(sheet.pivot.range.end);
    if (!start || !end) return [];
    const headerRow = Math.min(start.row, end.row);
    const headers: string[] = [];
    for (let col = Math.min(start.col, end.col); col <= Math.max(start.col, end.col); col += 1) {
      const cell = pivotSource.cells[refOf(col, headerRow)];
      headers.push(cell ? displayValue(cell) : '');
    }
    return headers;
  }, [sheet, pivotSource]);

  useEffect(() => {
    const pivot = workbook?.sheets.find((item) => item.name === active)?.pivot;
    setPivotDraft({
      rowField: pivot?.rowField || '',
      colField: pivot?.colField || '',
      valueField: pivot?.valueField || '',
      agg: pivot?.agg || 'SUM',
    });
  }, [active, workbook?.sheets.length]);

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
    await pendingWritesRef.current;
    undoStack.current.push({ sheet: sheet.name, cells: JSON.parse(JSON.stringify(latestCellsRef.current)) });
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
      if (parseRef(anchor) && parseRef(ref)) {
        setSelection(refsBetween(anchor, ref));
        setSelected(ref);
        return;
      }
    }
    setAnchor(ref);
    setSelection([ref]);
    setSelected(ref);
  }

  function persistSelection(anchorRef: string, focusRef: string) {
    if (!sheet) return;
    if (!parseRef(anchorRef) || !parseRef(focusRef)) return;
    void api
      .setSelection(id, sheet.name, { anchor: anchorRef, focus: focusRef })
      .then(applySheetResult)
      .catch(() => undefined);
  }

  function startDrag(ref: string, extend: boolean) {
    draggingRef.current = true;
    if (extend) {
      dragAnchorRef.current = parseRef(anchor) ? anchor : ref;
      setSelection(refsBetween(dragAnchorRef.current, ref));
    } else {
      dragAnchorRef.current = ref;
      setAnchor(ref);
      setSelection([ref]);
    }
    dragFocusRef.current = ref;
    setSelected(ref);
  }

  function extendDrag(ref: string) {
    if (!draggingRef.current) return;
    dragFocusRef.current = ref;
    setSelection(refsBetween(dragAnchorRef.current, ref));
    setSelected(ref);
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    persistSelection(dragAnchorRef.current, dragFocusRef.current);
  }

  function openInlineEdit(ref: string) {
    const cell = sheet?.cells[ref];
    setInlineEdit({ ref, value: cell?.formula || (cell ? displayValue(cell) : '') });
  }

  function commitInlineEdit(ref: string, value: string) {
    if (inlineCancelledRef.current) {
      inlineCancelledRef.current = false;
      return;
    }
    setInlineEdit(null);
    const cell = sheet?.cells[ref];
    const current = cell?.formula || (cell ? displayValue(cell) : '');
    if (value === current) return;
    void commitCell(value, ref);
  }

  function validationFor(ref: string): ValidationRule | null {
    return sheet?.validations?.[ref] || null;
  }

  async function commitCell(forcedValue?: string, refOverride?: string) {
    if (!sheet) return;
    const targetRef = refOverride || editingRefRef.current || selected;
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
    setError('');
    try {
      const result = await api.updateCells(id, sheet.name, { [targetRef]: update });
      applySheetResult(result);
      dirtyRef.current = false;
      if (editingRefRef.current === targetRef) {
        editingRefRef.current = null;
        setEditingRef(null);
      }
      // Force the grid to re-read the committed display value (formula cells
      // show their result, not the formula they were typed as).
      syncedKeyRef.current = '';
      setInfo('Saved.');
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
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
    pushHistory();
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
    pushHistory();
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

  function selectionBounds() {
    const parsed = selection
      .map((ref) => parseRef(ref))
      .filter((item): item is { col: number; row: number } => Boolean(item));
    if (!parsed.length) return { start: 'A1', end: 'A1' };
    const cols = parsed.map((item) => item.col);
    const rows = parsed.map((item) => item.row);
    return {
      start: refOf(Math.min(...cols), Math.min(...rows)),
      end: refOf(Math.max(...cols), Math.max(...rows)),
    };
  }

  async function createPivotSheet() {
    if (!sheet) return;
    const bounds = selectionBounds();
    setError('');
    try {
      const result = await api.createPivot(id, {
        source: sheet.name,
        start: bounds.start,
        end: bounds.end,
      });
      setInfo('Pivot table created.');
      setPivotDialogOpen(false);
      setDataMenuOpen(false);
      await load();
      setActive(result.sheet.name);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }


  function enqueueUndoRedo(task: () => Promise<void>) {
    const next = undoRedoQueueRef.current.then(task).catch(() => undefined);
    undoRedoQueueRef.current = next;
  }
  function handleUndo() {
    if (!sheet) return;
    enqueueUndoRedo(async () => {
      await pendingWritesRef.current;
      const snapshot = undoStack.current.pop();
      if (!snapshot) return;
      redoStack.current.push({ sheet: sheet.name, cells: JSON.parse(JSON.stringify(latestCellsRef.current)) });
      await run(() => api.replaceCells(id, snapshot.sheet, snapshot.cells), 'Undo.');
      setActive(snapshot.sheet);
    });
  }

  function handleRedo() {
    if (!sheet) return;
    enqueueUndoRedo(async () => {
      await pendingWritesRef.current;
      const snapshot = redoStack.current.pop();
      if (!snapshot) return;
      undoStack.current.push({ sheet: sheet.name, cells: JSON.parse(JSON.stringify(latestCellsRef.current)) });
      await run(() => api.replaceCells(id, snapshot.sheet, snapshot.cells), 'Redo.');
      setActive(snapshot.sheet);
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const label = target?.getAttribute('aria-label') || '';
      if (label === 'Formula bar' || label.startsWith('Edit ')) return;
      if (key === 'z') {
        event.preventDefault();
        undoRedoRef.current.undo();
      } else if (key === 'y') {
        event.preventDefault();
        undoRedoRef.current.redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  undoRedoRef.current = { undo: () => void handleUndo(), redo: () => void handleRedo() };
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
          value={formulaValue}
          onChange={(event) => {
            formulaRef.current = event.target.value;
            setFormulaValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitCell(formulaRef.current, selected);
            }
          }}
        />
        <button type="button" onClick={() => commitCell(formulaRef.current, selected)}>
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
          onClick={() => { pushHistory(); void run(() => api.insertRows(id, sheet.name, selectedParsed.row, 1, 'insert'), 'Row inserted.'); }}
        >
          Insert row
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.insertRows(id, sheet.name, selectedParsed.row, 1, 'delete'), 'Row deleted.'); }}
        >
          Delete row
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.insertColumns(id, sheet.name, selectedParsed.col, 1, 'insert'), 'Column inserted.'); }}
        >
          Insert column
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.insertColumns(id, sheet.name, selectedParsed.col, 1, 'delete'), 'Column deleted.'); }}
        >
          Delete column
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.sortSheet(id, sheet.name, colLetter(selectedParsed.col), 'asc'), 'Sorted ascending.'); }}
        >
          Sort column ↑
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.sortSheet(id, sheet.name, colLetter(selectedParsed.col), 'desc'), 'Sorted descending.'); }}
        >
          Sort column ↓
        </button>
        <a className="button-link" href={api.exportUrl(id, sheet.name)}>
          Export CSV
        </a>
      </div>

      <div className="grid-wrap">
        <table className="sheet-grid" role="grid" aria-multiselectable="true">
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
                  const isSelected = selection.includes(ref);
                  const cellProps = {
                    role: 'gridcell' as const,
                    'aria-label': `Cell ${ref}`,
                    'aria-selected': isSelected,
                    className: isSelected ? 'selected' : '',
                    onMouseDown: (event: React.MouseEvent) => startDrag(ref, event.shiftKey),
                    onMouseEnter: () => extendDrag(ref),
                    onMouseUp: endDrag,
                    onDoubleClick: () => openInlineEdit(ref),
                  };
                  if (inlineEdit?.ref === ref) {
                    return (
                      <td key={ref} {...cellProps}>
                        <input
                          aria-label={`Edit ${ref}`}
                          autoFocus
                          value={inlineEdit.value}
                          onChange={(event) => setInlineEdit({ ref, value: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              inlineCancelledRef.current = true;
                              setInlineEdit(null);
                              return;
                            }
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitInlineEdit(ref, inlineEdit.value);
                            }
                          }}
                          onBlur={() => {
                            if (inlineCancelledRef.current) {
                              inlineCancelledRef.current = false;
                              return;
                            }
                            commitInlineEdit(ref, inlineEdit.value);
                          }}
                        />
                      </td>
                    );
                  }
                  if (rule?.type === 'list') {
                    return (
                      <td key={ref} {...cellProps}>
                        <span>{displayValue(cell)}</span>
                        <button
                          type="button"
                          onClick={() => setOpenDropdownRef(openDropdownRef === ref ? null : ref)}
                        >
                          {`Open dropdown for ${ref}`}
                        </button>
                        {openDropdownRef === ref && (
                          <select
                            aria-label={`Cell ${ref}`}
                            value={displayValue(cell)}
                            autoFocus
                            onChange={(event) => {
                              setOpenDropdownRef(null);
                              commitCell(event.target.value, ref);
                            }}
                            onBlur={() => setOpenDropdownRef(null)}
                          >
                            <option value="">(empty)</option>
                            {rule.values.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    );
                  }
                  const cellDisplay = displayValue(cell);
                  if (cellDisplay.includes('\n') || cellDisplay.includes('\r')) {
                    return (
                      <td key={ref} {...cellProps}>
                        <textarea
                          aria-label={`Cell ${ref}`}
                          className={selection.includes(ref) ? 'selected' : ''}
                          value={editingRef === ref && dirtyRef.current ? editValue : cellDisplay}
                          onFocus={(event) => {
                            editingRefRef.current = ref;
                            setEditingRef(ref);
                            dirtyRef.current = false;
                            const gridText = cellDisplay;
                            editRef.current = gridText;
                            setEditValue(gridText);
                            formulaRef.current = cell?.formula || gridText;
                            setFormulaValue(formulaRef.current);
                            selectCell(ref, event.shiftKey);
                          }}
                          onChange={(event) => {
                            editingRefRef.current = ref;
                            dirtyRef.current = true;
                            setEditingRef(ref);
                            setSelected(ref);
                            editRef.current = event.target.value;
                            setEditValue(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitCell();
                              dirtyRef.current = false;
                            }
                          }}
                          onBlur={() => {
                            if (dirtyRef.current && editingRef === ref) {
                              commitCell(undefined, ref);
                            }
                            if (editingRef === ref) setEditingRef(null);
                            dirtyRef.current = false;
                            if (editingRefRef.current === ref) editingRefRef.current = null;
                          }}
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={ref} {...cellProps}>
                      <input
                        aria-label={`Cell ${ref}`}
                        className={selection.includes(ref) ? 'selected' : ''}
                        type={rule?.type === 'number' ? 'number' : 'text'}
                        value={editingRef === ref && dirtyRef.current ? editValue : displayValue(cell)}
                        onFocus={(event) => {
                          editingRefRef.current = ref;
                          setEditingRef(ref);
                          dirtyRef.current = false;
                          const gridText = displayValue(cell);
                          editRef.current = gridText;
                          setEditValue(gridText);
                          formulaRef.current = cell?.formula || gridText;
                          setFormulaValue(formulaRef.current);
                          selectCell(ref, event.shiftKey);
                        }}
                        onChange={(event) => {
                          editingRefRef.current = ref;
                          dirtyRef.current = true;
                          setEditingRef(ref);
                          setSelected(ref);
                          editRef.current = event.target.value;
                          setEditValue(event.target.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitCell();
                            dirtyRef.current = false;
                          }
                        }}
                        onBlur={() => {
                          if (dirtyRef.current && editingRef === ref) {
                            commitCell(undefined, ref);
                          }
                          if (editingRef === ref) setEditingRef(null);
                          dirtyRef.current = false;
                          if (editingRefRef.current === ref) editingRefRef.current = null;
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

      <h2>Data</h2>
      <div className="toolbar">
        <button type="button" onClick={() => setDataMenuOpen((open) => !open)}>
          Data
        </button>
        {dataMenuOpen && (
          <div className="menu" role="menu">
            <button type="button" role="menuitem" onClick={() => setPivotDialogOpen(true)}>
              Create pivot table
            </button>
          </div>
        )}
        {!dataMenuOpen && (
          <button type="button" onClick={() => setPivotDialogOpen(true)}>
            Create pivot table
          </button>
        )}
      </div>

      {pivotDialogOpen && (
        <div role="dialog" aria-label="Create pivot table" className="panel">
          <h3>Create pivot table</h3>
          <p>{`Source range: ${selectionBounds().start}:${selectionBounds().end}`}</p>
          <label>
            <input type="radio" name="pivot-target" value="new" checked readOnly /> New worksheet
          </label>
          <div className="toolbar">
            <button type="button" onClick={createPivotSheet}>
              Create
            </button>
            <button type="button" onClick={() => setPivotDialogOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {sheet.pivot && (
        <div role="region" aria-label="Pivot table editor" className="panel">
          <h3>Pivot table editor</h3>
          <div className="toolbar">
            <label>
              Rows
              <select
                aria-label="Rows"
                value={pivotDraft.rowField}
                onChange={(event) => setPivotDraft({ ...pivotDraft, rowField: event.target.value })}
              >
                <option value="">(select field)</option>
                {pivotHeaders.map((header) => (
                  <option key={`rows-${header}`} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Columns
              <select
                aria-label="Columns"
                value={pivotDraft.colField}
                onChange={(event) => setPivotDraft({ ...pivotDraft, colField: event.target.value })}
              >
                <option value="">(none)</option>
                {pivotHeaders.map((header) => (
                  <option key={`cols-${header}`} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Values
              <select
                aria-label="Values"
                value={pivotDraft.valueField}
                onChange={(event) => setPivotDraft({ ...pivotDraft, valueField: event.target.value })}
              >
                <option value="">(select field)</option>
                {pivotHeaders.map((header) => (
                  <option key={`values-${header}`} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Summarize by
              <select
                aria-label="Summarize by"
                value={pivotDraft.agg}
                onChange={(event) => setPivotDraft({ ...pivotDraft, agg: event.target.value })}
              >
                <option value="SUM">SUM</option>
                <option value="COUNT">COUNT</option>
                <option value="AVERAGE">AVERAGE</option>
              </select>
            </label>
            <button type="button" onClick={() => run(() => api.applyPivot(id, sheet.name, pivotDraft), 'Pivot updated.')}>
              Apply
            </button>
            <button type="button" onClick={() => run(() => api.refreshPivot(id, sheet.name), 'Pivot refreshed.')}>
              Refresh pivot table
            </button>
          </div>
        </div>
      )}

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
















