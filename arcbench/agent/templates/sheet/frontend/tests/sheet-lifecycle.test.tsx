import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import SheetPage from '../src/pages/SheetPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  deleteWorksheet: vi.fn(),
  getWorkbook: vi.fn(),
  renameWorksheet: vi.fn(),
}));

const sheet1 = {
  name: 'Sheet1',
  cells: { A1: { value: 'Region' } },
  validations: {},
  filters: [],
  selection: null,
  pivot: null,
};
const sheet2 = {
  name: 'Sheet2',
  cells: { A1: { value: 'East' } },
  validations: {},
  filters: [],
  selection: null,
  pivot: null,
};

function mockWorkbook() {
  vi.mocked(api.getWorkbook).mockResolvedValue({
    id: 'wb-lifecycle',
    name: 'Lifecycle workbook',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastActiveSheet: 'Sheet1',
    worksheets: ['Sheet1', 'Sheet2'],
    sheets: [sheet1, sheet2],
  });
  vi.mocked(api.renameWorksheet).mockResolvedValue();
  vi.mocked(api.deleteWorksheet).mockResolvedValue();
}

function renderSheet() {
  return render(
    <MemoryRouter initialEntries={['/workbooks/wb-lifecycle']}>
      <Routes>
        <Route path="/workbooks/:id" element={<SheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Sheet worksheet lifecycle', () => {
  it('exposes worksheet tabs and renames through the worksheet options menu', async () => {
    mockWorkbook();
    const user = userEvent.setup();
    renderSheet();

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Sheet1' })).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Sheet1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Sheet2' })).toHaveAttribute('aria-selected', 'false');

    await user.click(screen.getByRole('button', { name: 'Worksheet options for Sheet2' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));

    const dialog = screen.getByRole('dialog', { name: 'Rename worksheet' });
    expect(within(dialog).getByLabelText('Worksheet name')).toHaveValue('Sheet2');
    await user.clear(within(dialog).getByLabelText('Worksheet name'));
    await user.type(within(dialog).getByLabelText('Worksheet name'), 'Budget');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.renameWorksheet).toHaveBeenCalledWith('wb-lifecycle', 'Sheet2', 'Budget'),
    );
  });

  it('deletes through a named confirmation dialog', async () => {
    mockWorkbook();
    const user = userEvent.setup();
    renderSheet();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Worksheet options for Sheet2' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Worksheet options for Sheet2' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete worksheet' });
    expect(within(dialog).getByText(/Sheet2/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete worksheet' }));

    await waitFor(() =>
      expect(api.deleteWorksheet).toHaveBeenCalledWith('wb-lifecycle', 'Sheet2'),
    );
  });
});
