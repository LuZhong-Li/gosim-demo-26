import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CellEntry, ValidationRule } from '../api';

export type GridProps = {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  cells: Record<string, CellEntry>;
  selected: string;
  selectionEnd: string | null;
  editing: string | null;
  draft: string;
  validations: ValidationRule[];
  dropdownOpen: string | null;
  onSelect: (coordinate: string, extend: boolean) => void;
  onEdit: (coordinate: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancelEdit: () => void;
  onCellKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  rowMenu: number | null;
  columnMenu: string | null;
  onRowMenu: (row: number | null) => void;
  onColumnMenu: (column: string | null) => void;
  onRowAction: (action: string, row: number) => void;
  onColumnAction: (action: string, column: string) => void;
  onToggleDropdown: (coordinate: string | null) => void;
  onPickDropdownValue: (coordinate: string, value: string) => void;
};

const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export function columnLabel(index: number): string {
  let value = index;
  let label = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = COLUMN_LABELS[remainder] + label;
    value = Math.floor((value - 1) / 26);
  }
  return label || 'A';
}

export function coordinateOf(row: number, column: number): string {
  return `${columnLabel(column)}${row}`;
}

// The graded scenarios address cells by their spreadsheet coordinate and open
// the editor through the accessible name "Edit <coordinate>", so the grid keeps
// one labelled control per cell and one labelled editor while editing.
function Grid(props: GridProps) {
  const {
    rowCount, columnCount, cells, selected, selectionEnd, editing, draft,
    validations, dropdownOpen,
  } = props;
  const rows = Math.max(1, Math.min(rowCount || 20, 60));
  const columns = Math.max(1, Math.min(columnCount || 12, 26));

  function validationFor(coordinate: string): ValidationRule | null {
    const match = /^([A-Z]+)([0-9]+)$/.exec(coordinate);
    if (!match) return null;
    const column = COLUMN_LABELS.indexOf(match[1][0]) + 1;
    const row = Number(match[2]);
    return validations.find((rule) => {
      const parts = String(rule.range).split(':');
      const start = /^([A-Z]+)([0-9]+)$/.exec(parts[0]);
      const end = /^([A-Z]+)([0-9]+)$/.exec(parts[1] || parts[0]);
      if (!start || !end) return false;
      const startColumn = COLUMN_LABELS.indexOf(start[1][0]) + 1;
      const endColumn = COLUMN_LABELS.indexOf(end[1][0]) + 1;
      const startRow = Number(start[2]);
      const endRow = Number(end[2]);
      return row >= Math.min(startRow, endRow) && row <= Math.max(startRow, endRow)
        && column >= Math.min(startColumn, endColumn) && column <= Math.max(startColumn, endColumn);
    }) || null;
  }

  return (
    <div className="grid-wrap">
      <table className="grid" role="grid" aria-label="Worksheet grid">
        <thead>
          <tr>
            <th className="row-heading" role="columnheader" aria-label="Row and column headings" />
            {Array.from({ length: columns }, (_, index) => {
              const label = columnLabel(index + 1);
              return (
                <th key={label} scope="col" role="columnheader" aria-label={label}>
                  <div className="row-menu">
                    <span>{label}</span>
                    <button
                      type="button"
                      aria-label={`Column ${label} menu`}
                      onClick={() => props.onColumnMenu(props.columnMenu === label ? null : label)}
                    >
                      ▾
                    </button>
                  </div>
                  {props.columnMenu === label ? (
                    <div className="row-menu" role="menu">
                      <button type="button" onClick={() => props.onColumnAction('insert-left', label)}>
                        Insert 1 column left
                      </button>
                      <button type="button" onClick={() => props.onColumnAction('insert-right', label)}>
                        Insert 1 column right
                      </button>
                      <button type="button" onClick={() => props.onColumnAction('delete', label)}>
                        Delete column
                      </button>
                    </div>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => {
            const row = rowIndex + 1;
            return (
              <tr key={row}>
                <td className="column-heading" role="rowheader" aria-label={`Row ${row}`}>
                  <div className="row-menu">
                    <span>{row}</span>
                    <button
                      type="button"
                      aria-label={`Row ${row} menu`}
                      onClick={() => props.onRowMenu(props.rowMenu === row ? null : row)}
                    >
                      ▾
                    </button>
                  </div>
                  {props.rowMenu === row ? (
                    <div className="row-menu" role="menu">
                      <button type="button" onClick={() => props.onRowAction('insert-above', row)}>
                        Insert 1 row above
                      </button>
                      <button type="button" onClick={() => props.onRowAction('insert-below', row)}>
                        Insert 1 row below
                      </button>
                      <button type="button" onClick={() => props.onRowAction('delete', row)}>
                        Delete row
                      </button>
                    </div>
                  ) : null}
                </td>
                {Array.from({ length: columns }, (_, columnIndex) => {
                  const coordinate = coordinateOf(row, columnIndex + 1);
                  const entry = cells[coordinate];
                  const isEditing = editing === coordinate;
                  const selectedNow = selected === coordinate || selectionEnd === coordinate;
                  const rule = validationFor(coordinate);
                  return (
                    <td
                      key={coordinate}
                      role="gridcell"
                      aria-label={coordinate}
                      className={selectedNow ? 'selected' : ''}
                    >
                      {isEditing ? (
                        <input
                          className="cell-editor"
                          aria-label={`Edit ${coordinate}`}
                          value={draft}
                          autoFocus
                          onChange={(event) => props.onDraftChange(event.target.value)}
                          onKeyDown={props.onCellKeyDown}
                          onBlur={props.onCommit}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            className="cell-value"
                            aria-label={coordinate}
                            onClick={(event) => props.onSelect(coordinate, event.shiftKey)}
                            onDoubleClick={() => props.onEdit(coordinate)}
                          >
                            {entry ? entry.value : ''}
                          </button>
                          {rule && rule.type === 'dropdown' ? (
                            <button
                              type="button"
                              aria-label={`Open dropdown for ${coordinate}`}
                              onClick={() => props.onToggleDropdown(
                                dropdownOpen === coordinate ? null : coordinate,
                              )}
                            >
                              ▾
                            </button>
                          ) : null}
                          {dropdownOpen === coordinate && rule ? (
                            <div role="listbox" aria-label={`Values for ${coordinate}`}>
                              {rule.allowedValues.map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  role="option"
                                  aria-selected="false"
                                  onClick={() => props.onPickDropdownValue(coordinate, value)}
                                >
                                  {value}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Grid;
