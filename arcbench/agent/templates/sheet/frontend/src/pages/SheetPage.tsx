import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Cell, FilterConfig, ValidationRule, WorkbookDetail, Worksheet } from '../api';
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

function cloneWorksheet(worksheet: Worksheet): Worksheet {
  return JSON.parse(JSON.stringify(worksheet)) as Worksheet;
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
  const [filterOp, setFilterOp] = useState<FilterConfig['op']>('contains');
  const [filterValue, setFilterValue] = useState('');
  const [appliedFilter, setAppliedFilter] = useState<FilterConfig | null>(null);
  const [listValues, setListValues] = useState('');
  const [numberMin, setNumberMin] = useState('0');
  const [numberMax, setNumberMax] = useState('100');
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [openDropdownRef, setOpenDropdownRef] = useState<string | null>(null);
  const [pivotDialogOpen, setPivotDialogOpen] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [sortByCol, setSortByCol] = useState('A');
  const [sortOrder, setSortOrder] = useState('asc');
  const [sortHeaderRow, setSortHeaderRow] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationType, setValidationType] = useState('list');
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
  const [openWorksheetMenu, setOpenWorksheetMenu] = useState<string | null>(null);
  const [renameSheetTarget, setRenameSheetTarget] = useState<string | null>(null);
  const [renameSheetError, setRenameSheetError] = useState('');
  const [deleteSheetTarget, setDeleteSheetTarget] = useState<string | null>(null);
  const [renameWorkbookOpen, setRenameWorkbookOpen] = useState(false);
  const [renameWorkbookValue, setRenameWorkbookValue] = useState('');
  const [renameWorkbookError, setRenameWorkbookError] = useState('');
  const undoStack = useRef<{ sheet: string; worksheet: Worksheet }[]>([]);
  const redoStack = useRef<{ sheet: string; worksheet: Worksheet }[]>([]);
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
  const latestSheetRef = useRef<Worksheet | null>(null);
  const load = useCallback(async () => {
    try {
      const detail = await api.getWorkbook(id);
      setWorkbook(detail);
      setActive((current) => {
        const preferred =
          detail.lastActiveSheet && detail.sheets.some((sheet) => sheet.name === detail.lastActiveSheet)
            ? detail.lastActiveSheet
            : '';
        const candidate = preferred || current;
        return candidate && detail.sheets.some((sheet) => sheet.name === candidate)
          ? candidate
          : detail.sheets[0]?.name || '';
      });
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

  // Keep latestCellsRef in sync with the active worksheet so undo/redo snapshots
  // capture the last server-confirmed cell state instead of an empty map.
  useEffect(() => {
    if (!sheet) return;
    latestCellsRef.current = sheet.cells;
    latestSheetRef.current = cloneWorksheet(sheet);
  }, [sheet]);

  useEffect(() => {
    const persisted = sheet?.filters?.[0] || null;
    setAppliedFilter(persisted);
    setFilterColumn(persisted?.column || '');
    setFilterOp(persisted?.op || 'contains');
    setFilterValue(persisted?.value || '');
  }, [active, sheet?.name, sheet?.filters]);

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
    latestCellsRef.current = result.cells;
    latestSheetRef.current = cloneWorksheet(result);
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
    const snapshot = latestSheetRef.current || sheet;
    if (!snapshot) return;
    undoStack.current.push({ sheet: snapshot.name, worksheet: cloneWorksheet(snapshot) });
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

  async function applyFilter(override?: FilterConfig) {
    if (!sheet) return;
    const next = override || {
      column: filterColumn || 'A',
      op: filterOp,
      value: filterValue,
    };
    pushHistory();
    setError('');
    try {
      const filters = await api.setFilters(id, sheet.name, [next]);
      setAppliedFilter(filters[0] || null);
      setFilterDialogOpen(false);
      setDataMenuOpen(false);
      setInfo('Filter applied.');
      await load();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function clearFilter() {
    if (!sheet) return;
    pushHistory();
    setError('');
    try {
      await api.setFilters(id, sheet.name, []);
      setAppliedFilter(null);
      setFilterDialogOpen(false);
      setInfo('Filter cleared.');
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

  async function addWorksheet() {
    setError('');
    try {
      const created = await api.addWorksheet(id, newSheetName.trim());
      setNewSheetName('');
      setActive(created.name);
      await load();
      await api.setActiveSheet(id, created.name);
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  function openRenameWorksheet(name: string) {
    setOpenWorksheetMenu(null);
    setRenameSheetTarget(name);
    setRenameValue(name);
    setRenameSheetError('');
  }

  async function saveWorksheetName() {
    if (!renameSheetTarget) return;
    const name = renameValue.trim();
    if (!name) {
      setRenameSheetError('Worksheet name cannot be empty');
      return;
    }
    if (workbook?.sheets.some((item) => item.name === name && item.name !== renameSheetTarget)) {
      setRenameSheetError('Worksheet name already exists');
      return;
    }
    setRenameSheetError('');
    try {
      await api.renameWorksheet(id, renameSheetTarget, name);
      setRenameSheetTarget(null);
      await load();
    } catch (caught) {
      setRenameSheetError(api.errorMessage(caught));
    }
  }

  function requestDeleteWorksheet(name: string) {
    setOpenWorksheetMenu(null);
    if ((workbook?.sheets.length || 0) <= 1) {
      setError('A workbook must contain at least one worksheet');
      return;
    }
    setError('');
    setDeleteSheetTarget(name);
  }

  async function confirmDeleteWorksheet() {
    if (!deleteSheetTarget) return;
    setError('');
    try {
      await api.deleteWorksheet(id, deleteSheetTarget);
      setDeleteSheetTarget(null);
      await load();
    } catch (caught) {
      setDeleteSheetTarget(null);
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
      const current = latestSheetRef.current || sheet;
      if (current) {
        redoStack.current.push({
          sheet: current.name,
          worksheet: cloneWorksheet(current),
        });
      }
      await run(() => api.replaceWorksheet(id, snapshot.sheet, snapshot.worksheet), 'Undo.');
      setActive(snapshot.sheet);
    });
  }

  function handleRedo() {
    if (!sheet) return;
    enqueueUndoRedo(async () => {
      await pendingWritesRef.current;
      const snapshot = redoStack.current.pop();
      if (!snapshot) return;
      const current = latestSheetRef.current || sheet;
      if (current) {
        undoStack.current.push({
          sheet: current.name,
          worksheet: cloneWorksheet(current),
        });
      }
      await run(() => api.replaceWorksheet(id, snapshot.sheet, snapshot.worksheet), 'Redo.');
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
  const sortBounds = selectionBounds();
  const sortColumns: { column: string; label: string }[] = [];
  if (sheet) {
    const start = parseRef(sortBounds.start);
    const end = parseRef(sortBounds.end);
    if (start && end) {
      for (let col = Math.min(start.col, end.col); col <= Math.max(start.col, end.col); col += 1) {
        const column = colLetter(col);
        const header = displayValue(sheet.cells[refOf(col, Math.min(start.row, end.row))]);
        sortColumns.push({ column, label: header || column });
      }
    }
  }
  const activeSortByCol = sortColumns.some((option) => option.column === sortByCol)
    ? sortByCol
    : sortColumns[0]?.column || 'A';
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
        case 'before':
          return value !== '' && value < expected.toLowerCase();
        case 'is_empty':
          return value === '';
        case 'is_not_empty':
          return value !== '';
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

  function openRenameWorkbook() {
    setRenameWorkbookValue(workbook?.name || '');
    setRenameWorkbookError('');
    setRenameWorkbookOpen(true);
  }

  async function saveRenameWorkbook() {
    const next = renameWorkbookValue.trim();
    if (!next) {
      setRenameWorkbookError('Workbook name cannot be empty');
      return;
    }
    setError('');
    try {
      await api.renameWorkbook(id, next);
      setRenameWorkbookOpen(false);
      await load();
    } catch (caught) {
      setRenameWorkbookError(api.errorMessage(caught));
    }
  }

  return (
    <section className="panel wide">
      <div className="toolbar">
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.insertRows(id, sheet.name, selectedParsed.row, 1, 'insert'), 'Row inserted.'); }}
        >
          Insert 1 row above
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.insertRows(id, sheet.name, selectedParsed.row + 1, 1, 'insert'), 'Row inserted.'); }}
        >
          Insert 1 row below
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
          Insert 1 column left
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.insertColumns(id, sheet.name, selectedParsed.col + 1, 1, 'insert'), 'Column inserted.'); }}
        >
          Insert 1 column right
        </button>
        <button
          type="button"
          onClick={() => { pushHistory(); void run(() => api.insertColumns(id, sheet.name, selectedParsed.col, 1, 'delete'), 'Column deleted.'); }}
        >
          Delete column
        </button>
        <button
          type="button"
          onClick={() => {
            pushHistory();
            void run(
              () =>
                api.sortSheet(id, sheet.name, {
                  column: colLetter(selectedParsed.col),
                  direction: 'asc',
                  start: sortBounds.start,
                  end: sortBounds.end,
                  hasHeader: sortHeaderRow,
                }),
              'Sorted ascending.',
            );
          }}
        >
          Sort ascending
        </button>
        <button
          type="button"
          onClick={() => {
            pushHistory();
            void run(
              () =>
                api.sortSheet(id, sheet.name, {
                  column: colLetter(selectedParsed.col),
                  direction: 'desc',
                  start: sortBounds.start,
                  end: sortBounds.end,
                  hasHeader: sortHeaderRow,
                }),
              'Sorted descending.',
            );
          }}
        >
          Sort descending
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
                    'aria-label': ref,
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

      <div className="toolbar" role="tablist" aria-label="Worksheets">
        {workbook.sheets.map((item) => (
          <div key={item.name} className="worksheet-tab-item">
            <button
              type="button"
              role="tab"
              aria-selected={item.name === active}
              className={item.name === active ? 'active' : ''}
              onClick={() => {
                setActive(item.name);
                void api.setActiveSheet(id, item.name);
              }}
            >
              {item.name}
            </button>
            <button
              type="button"
              aria-label={`Worksheet options for ${item.name}`}
              aria-haspopup="menu"
              aria-expanded={openWorksheetMenu === item.name}
              onClick={() =>
                setOpenWorksheetMenu((current) => (current === item.name ? null : item.name))
              }
            >
              Options
            </button>
            {openWorksheetMenu === item.name && (
              <div className="menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openRenameWorksheet(item.name)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => requestDeleteWorksheet(item.name)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
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
        <button type="button" onClick={() => void addWorksheet()}>
          Add worksheet
        </button>
      </div>

      {renameSheetTarget && (
        <div role="dialog" aria-label="Rename worksheet" className="panel">
          <h3>Rename worksheet</h3>
          {renameSheetError && <p className="error">{renameSheetError}</p>}
          <div className="field">
            <label htmlFor="worksheet-name">Worksheet name</label>
            <input
              id="worksheet-name"
              type="text"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </div>
          <div className="toolbar">
            <button type="button" onClick={() => void saveWorksheetName()}>
              Save
            </button>
            <button type="button" onClick={() => setRenameSheetTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteSheetTarget && (
        <div role="dialog" aria-label="Delete worksheet" className="panel">
          <h3>Delete worksheet</h3>
          <p>{`Delete ${deleteSheetTarget}? This cannot be undone.`}</p>
          <div className="toolbar">
            <button type="button" onClick={() => void confirmDeleteWorksheet()}>
              Delete worksheet
            </button>
            <button type="button" onClick={() => setDeleteSheetTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <h2>Data validation</h2>
      <div className="toolbar">
        <input
          aria-label="List validation values"
          type="text"
          value={listValues}
          placeholder="open,closed,pending"
          onChange={(event) => setListValues(event.target.value)}
        />
        <button type="button" onClick={applyListValidation}>
          Apply
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
          Apply
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
        <select
          aria-label="Filter operator"
          value={filterOp}
          onChange={(event) => setFilterOp(event.target.value as FilterConfig['op'])}
        >
          <option value="contains">Text contains</option>
          <option value="eq">Equals</option>
          <option value="gt">Greater than</option>
          <option value="lt">Less than</option>
          <option value="before">Before</option>
          <option value="is_empty">Is empty</option>
          <option value="is_not_empty">Is not empty</option>
        </select>
        <input
          aria-label="Filter value"
          type="text"
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
        />
        <button type="button" onClick={() => void applyFilter()}>
          Apply
        </button>
        <button type="button" onClick={() => void clearFilter()}>
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSortByCol(activeSortByCol);
                setSortDialogOpen(true);
              }}
            >
              Sort range
            </button>
            <button type="button" role="menuitem" onClick={() => setFilterDialogOpen(true)}>
              Create filter
            </button>
            <button type="button" role="menuitem" onClick={() => setValidationDialogOpen(true)}>
              Data validation
            </button>
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

      {sortDialogOpen && (
        <div role="dialog" aria-label="Sort range" className="panel">
          <h3>Sort range</h3>
          <div className="field">
            <label htmlFor="sort-by">Sort by</label>
            <select id="sort-by" aria-label="Sort by" value={activeSortByCol} onChange={(event) => setSortByCol(event.target.value)}>
              {sortColumns.map((option) => (
                <option key={option.column} value={option.column}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sort-order">Order</label>
            <select id="sort-order" aria-label="Order" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <label className="check">
            <input type="checkbox" checked={sortHeaderRow} onChange={(event) => setSortHeaderRow(event.target.checked)} />
            Data has header row
          </label>
          <div className="toolbar">
            <button
              type="button"
              onClick={() => {
                pushHistory();
                void run(
                  () =>
                    api.sortSheet(id, sheet.name, {
                      column: activeSortByCol,
                      direction: sortOrder === 'desc' ? 'desc' : 'asc',
                      start: sortBounds.start,
                      end: sortBounds.end,
                      hasHeader: sortHeaderRow,
                    }),
                  'Sorted.',
                ).then(load);
                setSortDialogOpen(false);
              }}
            >
              Sort
            </button>
            <button type="button" onClick={() => setSortDialogOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {filterDialogOpen && (
        <div role="dialog" aria-label="Create filter" className="panel">
          <h3>Create filter</h3>
          <div className="field">
            <label htmlFor="filter-col">Filter</label>
            <input id="filter-col" aria-label="Filter column" type="text" value={filterColumn} placeholder="A" onChange={(event) => setFilterColumn(event.target.value.toUpperCase())} />
          </div>
          <div className="field">
            <label htmlFor="filter-op">Condition</label>
            <select
              id="filter-op"
              aria-label="Condition"
              value={filterOp}
              onChange={(event) => setFilterOp(event.target.value as FilterConfig['op'])}
            >
              <option value="contains">Text contains</option>
              <option value="eq">Equals</option>
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
              <option value="before">Before</option>
              <option value="is_empty">Is empty</option>
              <option value="is_not_empty">Is not empty</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-value">Value</label>
            <input id="filter-value" aria-label="Value" type="text" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} />
          </div>
          <div className="toolbar">
            <button type="button" onClick={() => void applyFilter({ column: filterColumn || 'A', op: filterOp, value: filterValue })}>Apply</button>
            <button type="button" onClick={() => { void clearFilter(); setFilterDialogOpen(false); }}>Clear selection</button>
            <button type="button" onClick={() => setFilterDialogOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {validationDialogOpen && (
        <div role="dialog" aria-label="Data validation" className="panel">
          <h3>Data validation</h3>
          <div className="field">
            <label htmlFor="rule-type">Rule type</label>
            <select id="rule-type" aria-label="Rule type" value={validationType} onChange={(event) => setValidationType(event.target.value)}>
              <option value="list">Dropdown</option>
              <option value="number">Number range</option>
            </select>
          </div>
          {validationType === 'list' ? (
            <div className="field">
              <label htmlFor="allowed-values">Allowed values</label>
              <input id="allowed-values" aria-label="Allowed values" type="text" value={listValues} placeholder="open,closed,pending" onChange={(event) => setListValues(event.target.value)} />
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="val-min">Minimum</label>
                <input id="val-min" aria-label="Minimum" type="number" value={numberMin} onChange={(event) => setNumberMin(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="val-max">Maximum</label>
                <input id="val-max" aria-label="Maximum" type="number" value={numberMax} onChange={(event) => setNumberMax(event.target.value)} />
              </div>
            </>
          )}
          <div className="toolbar">
            <button type="button" onClick={() => { if (validationType === 'list') applyListValidation(); else applyNumberValidation(); setValidationDialogOpen(false); }}>Apply</button>
            <button type="button" onClick={() => setValidationDialogOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

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

      {renameWorkbookOpen && (
        <div role="dialog" aria-label="Rename workbook" className="panel">
          <h3>Rename workbook</h3>
          {renameWorkbookError && <p className="error">{renameWorkbookError}</p>}
          <label>
            Workbook name
            <input
              aria-label="Workbook name"
              type="text"
              value={renameWorkbookValue}
              onChange={(event) => {
                setRenameWorkbookValue(event.target.value);
                setRenameWorkbookError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveRenameWorkbook();
              }}
            />
          </label>
          <div className="toolbar">
            <button type="button" onClick={() => void saveRenameWorkbook()}>
              Save
            </button>
            <button type="button" onClick={() => setRenameWorkbookOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}








