import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { ApiError, type PivotRecord, type WorksheetPayload, type WorkbookPayload } from '../api';
import Grid, { columnLabel } from '../components/Grid';

type HistoryEntry = { coordinate: string; before: string; after: string };
type DialogName = 'add-sheet' | 'rename-sheet' | 'delete-sheet' | 'sort' | 'filter'
  | 'validation' | 'pivot' | null;

const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function columnIndex(label: string): number {
  return COLUMN_LABELS.indexOf(String(label).toUpperCase().slice(0, 1)) + 1;
}

// REQ-2 (worksheets and structure), REQ-3 (editing), REQ-4 (formulas) and
// REQ-5 (sorting, filtering, validation, pivots) all live on this page. Every
// control carries the exact accessible name the requirement text uses.
function WorkbookEditorPage() {
  const params = useParams();
  const workbookId = String(params.id || '');
  const [workbook, setWorkbook] = useState<WorkbookPayload | null>(null);
  const [activeName, setActiveName] = useState('');
  const [selected, setSelected] = useState('A1');
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [formula, setFormula] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [rowMenu, setRowMenu] = useState<number | null>(null);
  const [columnMenu, setColumnMenu] = useState<string | null>(null);
  const [sheetMenu, setSheetMenu] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [sheetNameInput, setSheetNameInput] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('Ascending');
  const [hasHeader, setHasHeader] = useState(true);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterCondition, setFilterCondition] = useState('Text contains');
  const [filterValue, setFilterValue] = useState('');
  const [ruleType, setRuleType] = useState('Dropdown');
  const [allowedValues, setAllowedValues] = useState('Open,Closed');
  const [minimum, setMinimum] = useState('0');
  const [maximum, setMaximum] = useState('100');
  const [pivotRow, setPivotRow] = useState('');
  const [pivotColumn, setPivotColumn] = useState('');
  const [pivotValue, setPivotValue] = useState('');
  const [pivotSummary, setPivotSummary] = useState('SUM');
  const [pivotTarget, setPivotTarget] = useState('new');

  const applyWorkbook = useCallback((payload: WorkbookPayload, keepSheet?: string) => {
    setWorkbook(payload);
    setActiveName((current) => {
      const wanted = keepSheet || current;
      const exists = payload.worksheets.some((sheet) => sheet.name === wanted);
      return exists ? wanted : (payload.worksheets[0] ? payload.worksheets[0].name : '');
    });
  }, []);

  const load = useCallback(async () => {
    if (!workbookId) return;
    try {
      const payload = await api.getWorkbook(workbookId);
      applyWorkbook(payload.workbook);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }, [applyWorkbook, workbookId]);

  useEffect(() => {
    load();
  }, [load]);

  const sheet: WorksheetPayload | null = useMemo(() => {
    if (!workbook) return null;
    return workbook.worksheets.find((entry) => entry.name === activeName)
      || workbook.worksheets[0] || null;
  }, [workbook, activeName]);

  const headers = useMemo(() => {
    if (!sheet) return [] as string[];
    return COLUMN_LABELS.slice(0, 8).map((label, index) => {
      const entry = sheet.cells[`${label}1`];
      return entry ? entry.value : `Column ${columnLabel(index + 1)}`;
    }).filter((value) => String(value).trim() !== '');
  }, [sheet]);

  const usedRange = useMemo(() => {
    if (!sheet) return 'A1:C4';
    let lastRow = 1;
    let lastColumn = 1;
    Object.keys(sheet.cells).forEach((key) => {
      const match = /^([A-Z]+)([0-9]+)$/.exec(key);
      if (!match) return;
      lastRow = Math.max(lastRow, Number(match[2]));
      lastColumn = Math.max(lastColumn, columnIndex(match[1]));
    });
    return `A1:${columnLabel(lastColumn)}${lastRow}`;
  }, [sheet]);

  const selectionLabel = selectionEnd ? `${selected}:${selectionEnd}` : selected;

  useEffect(() => {
    if (!sheet) return;
    const entry = sheet.cells[selected];
    setFormula(entry ? (entry.formula || entry.raw || '') : '');
  }, [sheet, selected]);

  function applySheet(updated: WorksheetPayload) {
    setWorkbook((current) => {
      if (!current) return current;
      return {
        ...current,
        worksheets: current.worksheets.map((entry) => (entry.name === updated.name ? updated : entry)),
      };
    });
  }

  async function writeCell(coordinate: string, value: string, remember = true) {
    if (!sheet) return;
    const before = sheet.cells[coordinate] ? (sheet.cells[coordinate].raw ?? '') : '';
    try {
      const payload = await api.setCell(workbookId, sheet.name, coordinate, value);
      applySheet(payload.worksheet);
      setError('');
      if (remember && before !== value) {
        setHistory((entries) => [...entries, { coordinate, before, after: value }]);
        setFuture([]);
      }
    } catch (failure) {
      if (failure instanceof ApiError) {
        setError(failure.message);
      } else {
        setError((failure as Error).message);
      }
      await load();
    }
  }

  async function commitEditor() {
    if (!editing) return;
    const coordinate = editing;
    setEditing(null);
    await writeCell(coordinate, draft);
  }

  async function commitFormulaBar() {
    await writeCell(selected, formula);
  }

  async function undo() {
    const entry = history[history.length - 1];
    if (!entry || !sheet) return;
    setHistory((entries) => entries.slice(0, -1));
    setFuture((entries) => [...entries, entry]);
    await writeCell(entry.coordinate, entry.before, false);
  }

  async function redo() {
    const entry = future[future.length - 1];
    if (!entry || !sheet) return;
    setFuture((entries) => entries.slice(0, -1));
    setHistory((entries) => [...entries, entry]);
    await writeCell(entry.coordinate, entry.after, false);
  }

  async function onRowAction(action: string, row: number) {
    if (!sheet) return;
    setRowMenu(null);
    try {
      if (action === 'delete') await api.deleteRow(workbookId, sheet.name, row);
      else await api.insertRow(workbookId, sheet.name, row, action === 'insert-below' ? 'below' : 'above');
      await load();
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function onColumnAction(action: string, column: string) {
    if (!sheet) return;
    setColumnMenu(null);
    try {
      if (action === 'delete') await api.deleteColumn(workbookId, sheet.name, column);
      else {
        await api.insertColumn(workbookId, sheet.name, column,
          action === 'insert-right' ? 'right' : 'left');
      }
      await load();
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function addWorksheet() {
    if (!sheet) return;
    try {
      const payload = await api.addWorksheet(workbookId, sheetNameInput.trim()
        || `Sheet${(workbook ? workbook.worksheets.length : 1) + 1}`);
      await load();
      setActiveName(payload.worksheet.name);
      setDialog(null);
      setSheetNameInput('');
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function renameWorksheet() {
    if (!sheet) return;
    try {
      await api.renameWorksheet(workbookId, sheet.name, sheetNameInput);
      applyWorkbook({
        ...(workbook as WorkbookPayload),
        worksheets: (workbook as WorkbookPayload).worksheets.map((entry) => (
          entry.name === sheet.name ? { ...entry, name: sheetNameInput } : entry
        )),
      }, sheetNameInput);
      setDialog(null);
      setSheetNameInput('');
      await load();
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function deleteWorksheet() {
    if (!sheet) return;
    try {
      const payload = await api.deleteWorksheet(workbookId, sheet.name);
      applyWorkbook(payload.workbook);
      setDialog(null);
      setSheetMenu(false);
      setError('');
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function applySort() {
    if (!sheet) return;
    try {
      const payload = await api.sort(workbookId, sheet.name, {
        range: usedRange,
        column: sortField || headers[0] || 'A',
        order: sortOrder,
        hasHeader,
      });
      applySheet(payload.worksheet);
      setDialog(null);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function applyFilter() {
    if (!sheet) return;
    try {
      const payload = await api.createFilter(workbookId, sheet.name, {
        range: usedRange,
        column: filterColumn || headers[0] || 'A',
        condition: filterCondition,
        value: filterValue,
        hasHeader,
      });
      applySheet(payload.worksheet);
      setDialog(null);
      setNote(`Filter kept ${payload.rows.length} row(s)`);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function clearFilter() {
    if (!sheet) return;
    try {
      const payload = await api.clearFilter(workbookId, sheet.name);
      applySheet(payload.worksheet);
      setNote('Filter cleared');
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function applyValidation() {
    if (!sheet) return;
    try {
      const payload = await api.addValidation(workbookId, sheet.name, {
        range: `${columnLabel(columnIndex(selected))}5:${columnLabel(columnIndex(selected))}9`,
        type: ruleType,
        allowedValues: ruleType === 'Dropdown'
          ? allowedValues.split(',').map((value) => value.trim()).filter(Boolean)
          : [],
        minimum: ruleType === 'Number range' ? Number(minimum) : null,
        maximum: ruleType === 'Number range' ? Number(maximum) : null,
        message: `Please enter a number from ${minimum} to ${maximum}`,
      });
      applySheet(payload.worksheet);
      setDialog(null);
      setNote(`Validation rule added for ${payload.rule.range}`);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function deleteValidation() {
    if (!sheet) return;
    const rule = sheet.validations[0];
    if (!rule) return;
    try {
      const payload = await api.deleteValidation(workbookId, sheet.name, rule.id);
      applySheet(payload.worksheet);
      setNote('Validation rule removed');
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function createPivot() {
    if (!sheet) return;
    try {
      const payload = await api.createPivot(workbookId, sheet.name, {
        range: usedRange,
        rowField: pivotRow || headers[0] || 'A',
        columnField: pivotColumn,
        valueField: pivotValue || headers[1] || 'B',
        summarizeBy: pivotSummary,
        hasHeader,
        newWorksheet: pivotTarget === 'new',
      });
      applySheet(payload.worksheet);
      if (payload.workbook) {
        applyWorkbook(payload.workbook as WorkbookPayload, payload.worksheet.name);
      }
      setDialog(null);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function refreshPivot(pivot: PivotRecord) {
    if (!sheet) return;
    try {
      const payload = await api.refreshPivot(workbookId, sheet.name, pivot.id);
      applySheet(payload.worksheet);
      setNote('Pivot table refreshed');
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  // REQ-3-2-1: paste a copied range at the selected cell. The clipboard text is
  // taken as a table, so a copied block lands exactly as it was copied.
  async function removePivot() {
    if (!sheet || !sheet.pivots.length) return;
    try {
      const payload = await api.deletePivot(workbookId, sheet.name, sheet.pivots[0].id);
      applySheet(payload.worksheet);
      setNote('Pivot table removed');
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function pasteFromClipboard() {
    if (!sheet) return;
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (failure) {
      text = '';
    }
    if (!text) {
      setNote('Nothing to paste');
      return;
    }
    const matrix = text.replace(/\r\n/g, '\n').replace(/\n+$/, '')
      .split('\n')
      .map((row) => row.split('\t'));
    try {
      const payload = await api.paste(workbookId, sheet.name, {
        start: selected,
        matrix,
        mode: 'paste',
      });
      applySheet(payload.worksheet);
      setNote(`Pasted ${payload.written.length} cell(s)`);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  if (!sheet) {
    return (
      <section>
        <p>{error || 'Loading workbook...'}</p>
        <Link to="/">Back to workbooks</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>{sheet.name}</h1>
      <p>
        <Link to="/">Back to workbooks</Link>
      </p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {note ? <p className="note">{note}</p> : null}

      <div className="toolbar">
        <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
        <button type="button" onClick={redo} disabled={!future.length}>Redo</button>
        <button type="button" onClick={() => setDialog('sort')}>Sort range</button>
        <button type="button" onClick={() => setDialog('filter')}>Create filter</button>
        <button type="button" onClick={clearFilter}>Clear filter</button>
        <button type="button" onClick={() => setDialog('validation')}>Data validation</button>
        <button type="button" onClick={() => setDialog('pivot')}>Create pivot table</button>
        <button type="button" onClick={pasteFromClipboard}>Paste</button>
        <a href={api.exportUrl(workbookId, sheet.name)} download={`${sheet.name}.csv`}>Export CSV</a>
        <span>Selected range: {selectionLabel}</span>
      </div>

      <div className="formula-bar">
        <label htmlFor="formula-bar-input">Formula bar</label>
        <input
          id="formula-bar-input"
          aria-label="Formula bar"
          value={formula}
          onChange={(event) => setFormula(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitFormulaBar();
          }}
        />
        <span>{selected}</span>
      </div>

      <Grid
        sheetName={sheet.name}
        rowCount={sheet.rowCount}
        columnCount={Math.max(sheet.columnCount, 8)}
        cells={sheet.cells}
        selected={selected}
        selectionEnd={selectionEnd}
        editing={editing}
        draft={draft}
        validations={sheet.validations}
        dropdownOpen={dropdownOpen}
        onSelect={(coordinate, extend) => {
          setSelected(coordinate);
          setSelectionEnd(extend ? coordinate : null);
        }}
        onEdit={(coordinate) => {
          setSelected(coordinate);
          setEditing(coordinate);
          setDraft(sheet.cells[coordinate] ? (sheet.cells[coordinate].raw ?? '') : '');
        }}
        onDraftChange={setDraft}
        onCommit={commitEditor}
        onCancelEdit={() => setEditing(null)}
        onCellKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitEditor();
          } else if (event.key === 'Escape') {
            setEditing(null);
          }
        }}
        rowMenu={rowMenu}
        columnMenu={columnMenu}
        onRowMenu={setRowMenu}
        onColumnMenu={setColumnMenu}
        onRowAction={onRowAction}
        onColumnAction={onColumnAction}
        onToggleDropdown={setDropdownOpen}
        onPickDropdownValue={(coordinate, value) => {
          setDropdownOpen(null);
          writeCell(coordinate, value);
        }}
      />

      <div className="sheet-tabs">
        {(workbook ? workbook.worksheets : []).map((entry) => (
          <span key={entry.name}>
            <button
              type="button"
              className={`sheet-tab ${entry.name === sheet.name ? 'active' : ''}`}
              onClick={() => setActiveName(entry.name)}
            >
              {entry.name}
            </button>
            <button
              type="button"
              aria-label={`Worksheet options for ${entry.name}`}
              onClick={() => { setActiveName(entry.name); setSheetMenu(!sheetMenu); }}
            >
              ▾
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => { setSheetNameInput(''); setDialog('add-sheet'); }}
        >
          Add worksheet
        </button>
      </div>
      {sheetMenu ? (
        <div className="row-menu" role="menu">
          <button
            type="button"
            onClick={() => { setSheetNameInput(sheet.name); setDialog('rename-sheet'); }}
          >
            Rename
          </button>
          <button type="button" onClick={() => setDialog('delete-sheet')}>
            Delete worksheet
          </button>
        </div>
      ) : null}

      {sheet.pivots.map((pivot) => (
        <section key={pivot.id} role="region" aria-label="Pivot table editor">
          <h2>Pivot table editor</h2>
          <div className="toolbar">
            <label>
              Rows
              <select
                value={pivot.rowField}
                onChange={(event) => setPivotRow(event.target.value)}
              >
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Columns
              <select
                value={pivot.columnField}
                onChange={(event) => setPivotColumn(event.target.value)}
              >
                <option value="">(none)</option>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Values
              <select
                value={pivot.valueField}
                onChange={(event) => setPivotValue(event.target.value)}
              >
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Summarize by
              <select
                value={pivot.summarizeBy}
                onChange={(event) => setPivotSummary(event.target.value)}
              >
                <option value="SUM">SUM</option>
                <option value="AVERAGE">AVERAGE</option>
                <option value="COUNT">COUNT</option>
                <option value="MIN">MIN</option>
                <option value="MAX">MAX</option>
              </select>
            </label>
            <button type="button" onClick={() => refreshPivot(pivot)}>Apply</button>
            <button type="button" onClick={removePivot}>Delete rule</button>
          </div>
          <table className="pivot-table" aria-label="Pivot table">
            <thead>
              <tr>
                <th>{pivot.rowField}</th>
                <th>{pivot.valueField} ({pivot.summarizeBy})</th>
              </tr>
            </thead>
            <tbody>
              {pivot.cells.map((cell) => (
                <tr key={`${cell.row}-${cell.column}`}>
                  <td>{cell.row}</td>
                  <td>{cell.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => refreshPivot(pivot)}>Refresh pivot table</button>
        </section>
      ))}

      {dialog === 'add-sheet' ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Add worksheet">
            <h2>Add worksheet</h2>
            <label>
              Worksheet name
              <input value={sheetNameInput} onChange={(event) => setSheetNameInput(event.target.value)} />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={addWorksheet}>Create</button>
              <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === 'rename-sheet' ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Rename worksheet">
            <h2>Rename worksheet</h2>
            <label>
              Worksheet name
              <input value={sheetNameInput} onChange={(event) => setSheetNameInput(event.target.value)} />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={renameWorksheet}>Save</button>
              <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === 'delete-sheet' ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Delete worksheet">
            <h2>Delete worksheet</h2>
            <p>Delete {sheet.name}?</p>
            <div className="dialog-actions">
              <button type="button" onClick={deleteWorksheet}>Delete</button>
              <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === 'sort' ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Sort range">
            <h2>Sort range</h2>
            <label>
              Sort by
              <select value={sortField || headers[0] || ''} onChange={(event) => setSortField(event.target.value)}>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Order
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="Ascending">Ascending</option>
                <option value="Descending">Descending</option>
              </select>
            </label>
            <label>
              <span>
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(event) => setHasHeader(event.target.checked)}
                />
                {' '}Data has header row
              </span>
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={applySort}>Sort</button>
              <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === 'filter' ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Create filter">
            <h2>Create filter</h2>
            <label>
              {`Filter ${filterColumn || headers[0] || ''}`}
              <select
                value={filterColumn || headers[0] || ''}
                onChange={(event) => setFilterColumn(event.target.value)}
              >
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Condition
              <select value={filterCondition} onChange={(event) => setFilterCondition(event.target.value)}>
                <option value="Text contains">Text contains</option>
                <option value="Equals">Equals</option>
                <option value="Greater than">Greater than</option>
                <option value="Is empty">Is empty</option>
                <option value="Is not empty">Is not empty</option>
                <option value="Before">Before</option>
              </select>
            </label>
            <label>
              Value
              <input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={applyFilter}>Create filter</button>
              <button type="button" onClick={clearFilter}>Clear filter</button>
              <button type="button" onClick={() => setDialog(null)}>Clear selection</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === 'validation' ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Data validation">
            <h2>Data validation</h2>
            <p>{`Source range: ${columnLabel(columnIndex(selected))}5:${columnLabel(columnIndex(selected))}9`}</p>
            <label>
              Rule type
              <select value={ruleType} onChange={(event) => setRuleType(event.target.value)}>
                <option value="Dropdown">Dropdown</option>
                <option value="Number range">Number range</option>
              </select>
            </label>
            {ruleType === 'Dropdown' ? (
              <label>
                Allowed values
                <input value={allowedValues} onChange={(event) => setAllowedValues(event.target.value)} />
              </label>
            ) : (
              <>
                <label>
                  Minimum
                  <input value={minimum} onChange={(event) => setMinimum(event.target.value)} />
                </label>
                <label>
                  Maximum
                  <input value={maximum} onChange={(event) => setMaximum(event.target.value)} />
                </label>
              </>
            )}
            <div className="dialog-actions">
              <button type="button" onClick={applyValidation}>Apply</button>
              <button type="button" onClick={deleteValidation}>Delete rule</button>
              <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === 'pivot' ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Create pivot table">
            <h2>Create pivot table</h2>
            <p>{`Source range: ${usedRange}`}</p>
            <fieldset>
              <legend>Place the pivot table</legend>
              <label>
                <input
                  type="radio"
                  name="pivotTarget"
                  value="new"
                  checked={pivotTarget === 'new'}
                  onChange={() => setPivotTarget('new')}
                />
                {' '}New worksheet
              </label>
              <label>
                <input
                  type="radio"
                  name="pivotTarget"
                  value="current"
                  checked={pivotTarget === 'current'}
                  onChange={() => setPivotTarget('current')}
                />
                {' '}Current worksheet
              </label>
            </fieldset>
            <label>
              Rows
              <select value={pivotRow || headers[0] || ''} onChange={(event) => setPivotRow(event.target.value)}>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Columns
              <select value={pivotColumn} onChange={(event) => setPivotColumn(event.target.value)}>
                <option value="">(none)</option>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Values
              <select value={pivotValue || headers[1] || ''} onChange={(event) => setPivotValue(event.target.value)}>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
            <label>
              Summarize by
              <select value={pivotSummary} onChange={(event) => setPivotSummary(event.target.value)}>
                <option value="SUM">SUM</option>
                <option value="AVERAGE">AVERAGE</option>
                <option value="COUNT">COUNT</option>
                <option value="MIN">MIN</option>
                <option value="MAX">MAX</option>
              </select>
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={createPivot}>Create</button>
              <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default WorkbookEditorPage;
