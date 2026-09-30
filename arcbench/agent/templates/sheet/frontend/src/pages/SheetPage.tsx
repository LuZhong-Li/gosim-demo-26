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

function matchesFilter(value: string, filter: FilterConfig): boolean {
  const actual = value.toLowerCase();
  const expected = filter.value.toLowerCase();
  switch (filter.op) {
    case 'eq':
      return actual === expected;
    case 'gt':
      return Number(actual) > Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'before':
      return actual !== '' && actual < expected;
    case 'is_empty':
      return actual === '';
    case 'is_not_empty':
      return actual !== '';
    default:
      return actual.includes(expected);
  }
}

function validationError(rule: ValidationRule | null, value: string): string | null {
  if (!rule || value === '') return null;
  if (rule.type === 'list') {
    return rule.values.includes(value)
      ? null
      : `Please select one of the following values: ${rule.values.join(', ')}`;
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < rule.min || numeric > rule.max) {
    return rule.min === 0 && rule.max === 100
      ? 'Please enter a number from 0 to 100'
      : `Please enter a number between ${rule.min} and ${rule.max}`;
  }
  return null;
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

// REQ-4-1-2: relative references move with the target offset, absolute
// references ($A$1) stay put, and an offset that leaves the sheet becomes #REF!.
function shiftFormula(formula: string, rowDelta: number, colDelta: number): string {
  return formula.replace(
    /(\$?)([A-Za-z]+)(\$?)(\d+)/g,
    (match, colAnchor: string, letters: string, rowAnchor: string, digits: string) => {
      const col = colAnchor ? colIndex(letters) : colIndex(letters) + colDelta;
      const row = rowAnchor ? Number(digits) : Number(digits) + rowDelta;
      if (col < 1 || row < 1) return '#REF!';
      return `${colAnchor}${colLetter(col)}${rowAnchor}${row}`;
    },
  );
}

// REQ-3-1-2 / REQ-3-2-1: clipboard payloads are tab/newline separated text.
function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = normalized.split('\n');
  if (rows.length && rows[rows.length - 1] === '') rows.pop();
  return rows.map((row) => row.split('\t'));
}

function toTsv(rows: string[][]): string {
  return rows.map((row) => row.join('\t')).join('\n');
}

type Clipboard = {
  mode: 'copy' | 'cut';
  start: { col: number; row: number };
  cells: Record<string, Cell>;
} | null;

// REQ-2-2-1 / REQ-2-2-2 / REQ-3-1-2: the grid and the row/column headers each
// open a context menu whose commands use the ARIA menuitem role.
type ContextMenu = {
  kind: 'cell' | 'row' | 'col';
  row: number;
  col: number;
  x: number;
  y: number;
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
  const [historyVersion, setHistoryVersion] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOp, setFilterOp] = useState<FilterConfig['op']>('contains');
  const [filterValue, setFilterValue] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<FilterConfig[]>([]);
  const [filterValueSelections, setFilterValueSelections] = useState<string[]>([]);
  const [filterDialogLabel, setFilterDialogLabel] = useState('Create filter');
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
  const [validationHasExistingRule, setValidationHasExistingRule] = useState(false);
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
  const clipboardActionsRef = useRef({
    copy: () => undefined as void,
    cut: () => undefined as void,
    paste: () => undefined as void,
    hasInternal: () => false,
  });
  const pasteTextRef = useRef<(text: string) => void>(() => undefined);
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
    const persisted = sheet?.filters || [];
    const first = persisted[0] || null;
    setAppliedFilters(persisted);
    setFilterColumn(first?.column || '');
    setFilterOp(first?.op || 'contains');
    setFilterValue(first?.value || '');
    setFilterValueSelections(
      persisted.filter((filter) => filter.op === 'eq').map((filter) => filter.value),
    );
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
    // REQ-3-2-2: the toolbar buttons reflect whether an undo/redo is available.
    setHistoryVersion((version) => version + 1);
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

  // REQ-2-2-1 / REQ-2-2-2 / REQ-3-1-2: right clicking a cell, a row number or
  // a column header opens the matching menu of ARIA menuitems.
  function openContextMenu(
    event: React.MouseEvent,
    kind: 'cell' | 'row' | 'col',
    row: number,
    col: number,
  ) {
    event.preventDefault();
    setContextMenu({ kind, row, col, x: event.clientX, y: event.clientY });
  }

  function rowMenuAction(action: 'insert-above' | 'insert-below' | 'delete', row: number) {
    if (!sheet) return;
    setContextMenu(null);
    pushHistory();
    if (action === 'delete') {
      void run(() => api.insertRows(id, sheet.name, row, 1, 'delete'), 'Row deleted.');
      return;
    }
    const target = action === 'insert-above' ? row : row + 1;
    void run(() => api.insertRows(id, sheet.name, target, 1, 'insert'), 'Row inserted.');
  }

  function columnMenuAction(
    action: 'insert-left' | 'insert-right' | 'delete',
    col: number,
  ) {
    if (!sheet) return;
    setContextMenu(null);
    pushHistory();
    if (action === 'delete') {
      void run(() => api.insertColumns(id, sheet.name, col, 1, 'delete'), 'Column deleted.');
      return;
    }
    const target = action === 'insert-left' ? col : col + 1;
    void run(() => api.insertColumns(id, sheet.name, target, 1, 'insert'), 'Column inserted.');
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
    const invalid = validationError(rule, value);
    if (invalid) {
      setError(invalid);
      return;
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
    const bounds = selectionBounds();
    const start = parseRef(bounds.start) || { col: 1, row: 1 };
    const cells: Record<string, Cell> = {};
    for (const ref of selection) {
      const cell = sheet.cells[ref];
      if (cell) cells[ref] = JSON.parse(JSON.stringify(cell));
    }
    setClipboard({ mode, start, cells });
    setContextMenu(null);
    // REQ-3-2-1: also publish the rectangle as TSV so it can round-trip
    // through the system clipboard. jsdom and insecure origins reject this.
    publishToSystemClipboard(toTsv(selectionMatrixText()));
    setInfo(mode === 'copy' ? 'Copied selection.' : 'Cut selection.');
  }

  function publishToSystemClipboard(text: string) {
    try {
      const write = navigator.clipboard?.writeText;
      if (typeof write === 'function') {
        void Promise.resolve(navigator.clipboard.writeText(text)).catch(() => undefined);
      }
    } catch {
      // Clipboard access is optional; the internal clipboard still works.
    }
  }

  // The currently selected rectangle rendered as the text a user would copy.
  function selectionMatrixText(): string[][] {
    const bounds = selectionBounds();
    const start = parseRef(bounds.start);
    const end = parseRef(bounds.end);
    if (!start || !end) return [[]];
    const rows: string[][] = [];
    for (let row = start.row; row <= end.row; row += 1) {
      const rowValues: string[] = [];
      for (let col = start.col; col <= end.col; col += 1) {
        const cell = sheet?.cells[refOf(col, row)];
        rowValues.push(cell?.formula || displayValue(cell));
      }
      rows.push(rowValues);
    }
    return rows;
  }

  // The last copied/cut rectangle, rebuilt from the internal clipboard when the
  // system clipboard is unavailable (jsdom, denied permission, http origin).
  function internalClipboardRows(): string[][] {
    if (!clipboard) return [];
    const parsed = Object.keys(clipboard.cells)
      .map((ref) => parseRef(ref))
      .filter((item): item is { col: number; row: number } => Boolean(item));
    if (!parsed.length) return [];
    const lastRow = Math.max(...parsed.map((item) => item.row));
    const lastCol = Math.max(...parsed.map((item) => item.col));
    const rows: string[][] = [];
    for (let row = clipboard.start.row; row <= lastRow; row += 1) {
      const rowValues: string[] = [];
      for (let col = clipboard.start.col; col <= lastCol; col += 1) {
        const cell = clipboard.cells[refOf(col, row)];
        rowValues.push(cell?.formula || displayValue(cell));
      }
      rows.push(rowValues);
    }
    return rows;
  }

  // REQ-3-1-2 / REQ-3-2-1: plan one rectangle write. Every target is validated
  // up front so a single invalid cell rejects the whole operation.
  function planRectangle(
    targetRef: string,
    rows: string[][],
    formulaDelta: { row: number; col: number } = { row: 0, col: 0 },
  ): { updates: Record<string, Cell | null>; error: string | null } {
    const updates: Record<string, Cell | null> = {};
    const target = parseRef(targetRef);
    if (!target) return { updates, error: null };
    for (let rowOffset = 0; rowOffset < rows.length; rowOffset += 1) {
      const rowValues = rows[rowOffset];
      for (let colOffset = 0; colOffset < rowValues.length; colOffset += 1) {
        const value = rowValues[colOffset];
        const ref = refOf(target.col + colOffset, target.row + rowOffset);
        const invalid = validationError(validationFor(ref), value);
        if (invalid) return { updates, error: invalid };
        if (value === '') {
          updates[ref] = null;
        } else if (value.startsWith('=')) {
          updates[ref] = {
            value: 0,
            formula: shiftFormula(value, formulaDelta.row, formulaDelta.col),
          };
        } else {
          const numeric = Number(value);
          updates[ref] = { value: Number.isNaN(numeric) ? value : numeric };
        }
      }
    }
    return { updates, error: null };
  }

  async function commitUpdates(updates: Record<string, Cell | null>, message: string) {
    if (!sheet || !Object.keys(updates).length) return;
    pushHistory();
    setContextMenu(null);
    setError('');
    await run(() => api.updateCells(id, sheet.name, updates), message);
  }

  // REQ-3-1-2: paste external tab/newline separated text from the active cell.
  async function pasteText(text: string) {
    if (!sheet || !text) return;
    const rows = parseTsv(text);
    if (!rows.length) return;
    const { updates, error: validationFailure } = planRectangle(selected, rows);
    if (validationFailure) {
      setError(validationFailure);
      return;
    }
    await commitUpdates(updates, 'Pasted.');
  }

  async function pasteSelection() {
    if (!sheet || !clipboard) return;
    const target = parseRef(selected);
    if (!target) return;
    const rows = internalClipboardRows();
    if (!rows.length) return;
    const delta = { row: target.row - clipboard.start.row, col: target.col - clipboard.start.col };
    const { updates: writes, error: validationFailure } = planRectangle(selected, rows, delta);
    if (validationFailure) {
      setError(validationFailure);
      return;
    }
    const mode = clipboard.mode;
    const sourceRefs = Object.keys(clipboard.cells);
    const updates: Record<string, Cell | null> = { ...writes };
    if (mode === 'cut') {
      // REQ-3-2-1: the source is cleared in the same atomic write as the target.
      for (const ref of sourceRefs) {
        if (!Object.prototype.hasOwnProperty.call(writes, ref)) updates[ref] = null;
      }
      setClipboard(null);
    }
    await commitUpdates(updates, 'Pasted.');
  }

  // Ctrl+V first tries the system clipboard; the browser paste event is the
  // fallback for environments that block programmatic reads.
  async function pasteFromSystemClipboard() {
    try {
      const text = await navigator.clipboard?.readText?.();
      if (text) await pasteText(text);
    } catch {
      // Ignore: the paste event handler still receives the payload.
    }
  }

  clipboardActionsRef.current = {
    copy: () => copySelection('copy'),
    cut: () => copySelection('cut'),
    paste: () => {
      if (clipboard) void pasteSelection();
      else void pasteFromSystemClipboard();
    },
    hasInternal: () => Boolean(clipboard),
  };
  pasteTextRef.current = (text: string) => void pasteText(text);

  function validationRange() {
    return selection.length > 1
      ? `${selection[0]}:${selection[selection.length - 1]}`
      : selection[0];
  }

  function openValidationDialog() {
    const firstRule = selection.map((ref) => validationFor(ref)).find(Boolean) || null;
    if (firstRule?.type === 'list') {
      setValidationType('list');
      setListValues(firstRule.values.join(','));
    } else if (firstRule?.type === 'number') {
      setValidationType('number');
      setNumberMin(String(firstRule.min));
      setNumberMax(String(firstRule.max));
    }
    setValidationHasExistingRule(Boolean(firstRule));
    setError('');
    setValidationDialogOpen(true);
  }

  async function applyListValidation(): Promise<boolean> {
    if (!sheet) return false;
    const values = listValues.split(',').map((value) => value.trim()).filter(Boolean);
    if (!values.length) {
      setError('Provide at least one list value.');
      return false;
    }
    pushHistory();
    try {
      await api.setValidations(id, sheet.name, validationRange(), { type: 'list', values });
      setInfo('List validation applied.');
      await load();
      return true;
    } catch (caught) {
      setError(api.errorMessage(caught));
      return false;
    }
  }

  async function applyNumberValidation(): Promise<boolean> {
    if (!sheet) return false;
    pushHistory();
    try {
      await api.setValidations(id, sheet.name, validationRange(), {
        type: 'number',
        min: Number(numberMin),
        max: Number(numberMax),
      });
      setInfo('Number validation applied.');
      await load();
      return true;
    } catch (caught) {
      setError(api.errorMessage(caught));
      return false;
    }
  }

  async function saveValidation() {
    const saved =
      validationType === 'list' ? await applyListValidation() : await applyNumberValidation();
    if (saved) setValidationDialogOpen(false);
  }

  async function deleteValidationRule() {
    if (!sheet) return;
    pushHistory();
    try {
      await api.deleteValidations(id, sheet.name, validationRange());
      setValidationDialogOpen(false);
      setInfo('Validation rule deleted.');
      await load();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  async function applyFilter(nextFilters: FilterConfig[]) {
    if (!sheet) return;
    pushHistory();
    setError('');
    try {
      const filters = await api.setFilters(id, sheet.name, nextFilters);
      setAppliedFilters(filters);
      setFilterDialogOpen(false);
      setDataMenuOpen(false);
      setInfo('Filter applied.');
      await load();
    } catch (caught) {
      setError(api.errorMessage(caught));
    }
  }

  function applyDialogFilter() {
    const column = filterColumn || sortColumns[0]?.column || 'A';
    const additions: FilterConfig[] = filterValueSelections.length
      ? filterValueSelections.map((value) => ({ column, op: 'eq', value }))
      : [
          {
            column,
            op: filterOp,
            value:
              filterOp === 'is_empty' || filterOp === 'is_not_empty' ? '' : filterValue,
          },
        ];
    const next = appliedFilters.filter((filter) => filter.column !== column).concat(additions);
    void applyFilter(next);
  }

  async function clearFilter() {
    if (!sheet) return;
    pushHistory();
    setError('');
    try {
      await api.setFilters(id, sheet.name, []);
      setAppliedFilters([]);
      setFilterValueSelections([]);
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
      setHistoryVersion((version) => version + 1);
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
      setHistoryVersion((version) => version + 1);
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setContextMenu(null);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const label = target?.getAttribute('aria-label') || '';
      const tag = target?.tagName;
      const inTextField =
        tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable);
      if (label === 'Formula bar' || label.startsWith('Edit ')) return;
      if (key === 'z') {
        event.preventDefault();
        undoRedoRef.current.undo();
      } else if (key === 'y') {
        event.preventDefault();
        undoRedoRef.current.redo();
      } else if (!inTextField && (key === 'c' || key === 'x')) {
        // REQ-3-2-1: the grid owns copy/cut while a cell, not a text field,
        // has focus.
        event.preventDefault();
        if (key === 'c') clipboardActionsRef.current.copy();
        else clipboardActionsRef.current.cut();
      } else if (!inTextField && key === 'v' && clipboardActionsRef.current.hasInternal()) {
        // An in-app copy keeps the source origin so relative references can be
        // adjusted (REQ-4-1-2); external text falls through to the paste event.
        event.preventDefault();
        clipboardActionsRef.current.paste();
      }
    }
    // REQ-3-1-2: Ctrl+V with no focused text field is delivered as a paste
    // event on the document, so listen there and fall back to its payload.
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!text) return;
      event.preventDefault();
      pasteTextRef.current(text);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  undoRedoRef.current = { undo: () => void handleUndo(), redo: () => void handleRedo() };
  // REQ-3-2-2: the stacks live in refs, so this counter re-renders the toolbar
  // (and its disabled state) whenever a snapshot is pushed or consumed.
  const canUndo = useMemo(() => undoStack.current.length > 0, [historyVersion]);
  const canRedo = useMemo(() => redoStack.current.length > 0, [historyVersion]);
  useEffect(() => {
    if (!contextMenu) return undefined;
    function closeMenu() {
      setContextMenu(null);
    }
    window.addEventListener('mousedown', closeMenu);
    return () => window.removeEventListener('mousedown', closeMenu);
  }, [contextMenu]);
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
  const columnHeaders = Array.from({ length: COLS }, (_, index) => {
    const column = colLetter(index + 1);
    const label = displayValue(sheet?.cells[refOf(index + 1, 1)]);
    return { column, label: label || column };
  });
  const filterValueOptions: string[] = [];
  if (sheet && filterColumn) {
    const column = colIndex(filterColumn);
    const seen = new Set<string>();
    for (let row = 2; row <= ROWS; row += 1) {
      const value = displayValue(sheet.cells[refOf(column, row)]);
      if (!value || seen.has(value)) continue;
      seen.add(value);
      filterValueOptions.push(value);
    }
  }
  const visibleRows = useMemo(() => {
    const rows = Array.from({ length: ROWS }, (_, index) => index + 1);
    if (!appliedFilters.length || !sheet) return rows;
    const byColumn = new Map<string, FilterConfig[]>();
    for (const filter of appliedFilters) {
      const group = byColumn.get(filter.column) || [];
      group.push(filter);
      byColumn.set(filter.column, group);
    }
    const groups = [...byColumn.values()];
    return rows.filter((row) =>
      groups.every((group) =>
        group.some((filter) =>
          matchesFilter(displayValue(sheet.cells[refOf(colIndex(filter.column), row)]), filter),
        ),
      ),
    );
  }, [appliedFilters, sheet]);

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
      {error && <p className="error">{error}</p>}
      {info && <p className="success">{info}</p>}
      <div className="toolbar">
        {/* REQ-3-2-2: the toolbar exposes Undo and Redo alongside Ctrl+Z / Ctrl+Y. */}
        <button type="button" aria-label="Undo" disabled={!canUndo} onClick={() => void handleUndo()}>
          ↶ Undo
        </button>
        <button type="button" aria-label="Redo" disabled={!canRedo} onClick={() => void handleRedo()}>
          ↷ Redo
        </button>
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
      <div className="toolbar">
        <input
          aria-label="Formula bar"
          className="formula-bar"
          type="text"
          value={formulaValue}
          onChange={(event) => {
            formulaRef.current = event.target.value;
            setFormulaValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void commitCell(formulaValue);
          }}
        />
      </div>
      <div className="grid-wrap">
        <table
          className="sheet-grid"
          role="grid"
          aria-label="Worksheet grid"
          aria-multiselectable="true"
        >
          <thead>
            <tr>
              <th />
              {columnHeaders.map((header) => (
                <th
                  key={header.column}
                  scope="col"
                  role="columnheader"
                  aria-label={header.column}
                  onContextMenu={(event) =>
                    openContextMenu(event, 'col', 1, colIndex(header.column))
                  }
                >
                  {header.column}
                  <button
                    type="button"
                    aria-label={`Filter ${header.label}`}
                    onClick={() => {
                      const columnFilters = appliedFilters.filter(
                        (filter) => filter.column === header.column,
                      );
                      const condition = columnFilters.find((filter) => filter.op !== 'eq');
                      setFilterDialogLabel(`Filter ${header.label}`);
                      setFilterColumn(header.column);
                      setFilterValueSelections(
                        columnFilters
                          .filter((filter) => filter.op === 'eq')
                          .map((filter) => filter.value),
                      );
                      setFilterOp(condition?.op || 'contains');
                      setFilterValue(condition?.value || '');
                      setFilterDialogOpen(true);
                    }}
                  >
                    Filter
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((rowNumber) => (
              <tr key={rowNumber}>
                <th
                  scope="row"
                  role="rowheader"
                  aria-label={String(rowNumber)}
                  onContextMenu={(event) =>
                    openContextMenu(event, 'row', rowNumber, parseRef(selected)?.col || 1)
                  }
                >
                  {rowNumber}
                </th>
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
                    onContextMenu: (event: React.MouseEvent) => {
                      setAnchor(ref);
                      setSelection([ref]);
                      setSelected(ref);
                      openContextMenu(event, 'cell', rowNumber, colIndexValue + 1);
                    },
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
        <button type="button" onClick={applyDialogFilter}>
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setFilterDialogLabel('Create filter');
                setFilterColumn('');
                setFilterValueSelections([]);
                setFilterOp('contains');
                setFilterValue('');
                setFilterDialogOpen(true);
              }}
            >
              Create filter
            </button>
            <button type="button" role="menuitem" onClick={openValidationDialog}>
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
        <div role="dialog" aria-label={filterDialogLabel} className="panel">
          <h3>{filterDialogLabel}</h3>
          <div className="field">
            <label htmlFor="filter-col">Filter</label>
            <input id="filter-col" aria-label="Filter column" type="text" value={filterColumn} placeholder="A" onChange={(event) => setFilterColumn(event.target.value.toUpperCase())} />
          </div>
          <fieldset>
            <legend>Select values</legend>
            {filterValueOptions.map((value) => (
              <label key={value}>
                <input
                  type="checkbox"
                  aria-label={value}
                  checked={filterValueSelections.includes(value)}
                  onChange={(event) =>
                    setFilterValueSelections((current) =>
                      event.target.checked
                        ? [...current, value]
                        : current.filter((item) => item !== value),
                    )
                  }
                />
                {value}
              </label>
            ))}
          </fieldset>
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
            <button type="button" onClick={applyDialogFilter}>Apply</button>
            <button
              type="button"
              onClick={() => {
                setFilterValueSelections([]);
                setFilterValue('');
              }}
            >
              Clear selection
            </button>
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
            <button type="button" onClick={() => void saveValidation()}>
              Save
            </button>
            {validationHasExistingRule && (
              <button type="button" onClick={() => void deleteValidationRule()}>
                Delete rule
              </button>
            )}
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

      {/* REQ-2-2-1 / REQ-2-2-2 / REQ-3-1-2: context menus for the grid, the row
          numbers and the column headers. */}
      {contextMenu && (
        <div
          className="menu"
          role="menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 40,
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {contextMenu.kind === 'cell' && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => copySelection('cut')}
              >
                Cut
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => copySelection('copy')}
              >
                Copy
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!clipboard}
                onClick={() => void pasteSelection()}
              >
                Paste
              </button>
            </>
          )}
          {contextMenu.kind === 'row' && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => rowMenuAction('insert-above', contextMenu.row)}
              >
                Insert 1 row above
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => rowMenuAction('insert-below', contextMenu.row)}
              >
                Insert 1 row below
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => rowMenuAction('delete', contextMenu.row)}
              >
                Delete row
              </button>
            </>
          )}
          {contextMenu.kind === 'col' && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => columnMenuAction('insert-left', contextMenu.col)}
              >
                Insert 1 column left
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => columnMenuAction('insert-right', contextMenu.col)}
              >
                Insert 1 column right
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => columnMenuAction('delete', contextMenu.col)}
              >
                Delete column
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
