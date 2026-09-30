import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import SheetPage from '../src/pages/SheetPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getWorkbook: vi.fn(),
  updateCells: vi.fn(),
  setSelection: vi.fn(),
  replaceWorksheet: vi.fn(),
}));

const baseSheet = {
  name: 'Sheet1',
  cells: { A1: { value: 'Region' }, B1: { value: 'Sales' } },
  validations: {},
  filters: [],
  selection: null,
  pivot: null,
};

function mockWorkbook() {
  vi.mocked(api.getWorkbook).mockResolvedValue({
    id: 'wb-clip',
    name: 'Clipboard workbook',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastActiveSheet: 'Sheet1',
    worksheets: ['Sheet1'],
    sheets: [baseSheet],
  });
  vi.mocked(api.setSelection).mockResolvedValue(baseSheet);
  vi.mocked(api.updateCells).mockImplementation(async (_id, _sheet, updates) => ({
    ...baseSheet,
    cells: { ...baseSheet.cells, ...updates },
  }));
}

function renderSheet() {
  return render(
    <MemoryRouter initialEntries={['/workbooks/wb-clip']}>
      <Routes>
        <Route path="/workbooks/:id" element={<SheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Sheet clipboard and history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkbook();
  });

  it('exposes Undo and Redo toolbar buttons that follow the history stacks', async () => {
    const user = userEvent.setup();
    renderSheet();

    await waitFor(() => expect(screen.getByRole('gridcell', { name: 'A1' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

    await user.click(screen.getByRole('gridcell', { name: 'A1' }));
    const formulaBar = screen.getByLabelText('Formula bar');
    await user.clear(formulaBar);
    await user.type(formulaBar, 'Updated{Enter}');

    await waitFor(() => expect(api.updateCells).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled());
  });

  it('pastes external tab separated text from the active cell', async () => {
    const user = userEvent.setup();
    renderSheet();

    await waitFor(() => expect(screen.getByRole('gridcell', { name: 'A1' })).toBeInTheDocument());
    await user.click(screen.getByRole('gridcell', { name: 'B2' }));

    fireEvent.paste(window, {
      clipboardData: { getData: () => 'Alpha\t\t3\nBeta\tTwo\t4' },
    });

    await waitFor(() =>
      expect(api.updateCells).toHaveBeenCalledWith('wb-clip', 'Sheet1', {
        B2: { value: 'Alpha' },
        C2: null,
        D2: { value: 3 },
        B3: { value: 'Beta' },
        C3: { value: 'Two' },
        D3: { value: 4 },
      }),
    );
  });

  it('copies a cell with Ctrl+C and pastes it with Ctrl+V at the new selection', async () => {
    const user = userEvent.setup();
    renderSheet();

    await waitFor(() => expect(screen.getByRole('gridcell', { name: 'A1' })).toBeInTheDocument());
    await user.click(screen.getByRole('gridcell', { name: 'A1' }));
    await user.keyboard('{Control>}c{/Control}');
    await user.click(screen.getByRole('gridcell', { name: 'C3' }));
    await user.keyboard('{Control>}v{/Control}');

    await waitFor(() =>
      expect(api.updateCells).toHaveBeenCalledWith('wb-clip', 'Sheet1', {
        C3: { value: 'Region' },
      }),
    );
  });

  it('opens a grid context menu with Cut, Copy and Paste menuitems', async () => {
    renderSheet();

    await waitFor(() => expect(screen.getByRole('gridcell', { name: 'A1' })).toBeInTheDocument());
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'A1' }), {
      clientX: 12,
      clientY: 24,
    });

    expect(screen.getByRole('menuitem', { name: 'Cut' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Paste' })).toBeInTheDocument();
  });

  it('opens the row-number menu with menuitem commands', async () => {
    renderSheet();

    await waitFor(() => expect(screen.getByRole('rowheader', { name: '3' })).toBeInTheDocument());
    fireEvent.contextMenu(screen.getByRole('rowheader', { name: '3' }), {
      clientX: 4,
      clientY: 8,
    });

    expect(screen.getByRole('menuitem', { name: 'Insert 1 row above' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Insert 1 row below' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete row' })).toBeInTheDocument();
  });
});
