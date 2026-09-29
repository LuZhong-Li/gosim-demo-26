import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import SheetPage from '../src/pages/SheetPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getWorkbook: vi.fn(),
  setSelection: vi.fn(),
  sortSheet: vi.fn(),
}));

const worksheet = {
  name: 'Sheet1',
  cells: {
    A1: { value: 'Region' },
    B1: { value: 'Sales' },
    C1: { value: 'Status' },
    A2: { value: 'East' },
    B2: { value: 1200 },
    C2: { value: 'Open' },
    A3: { value: 'North' },
    B3: { value: 800 },
    C3: { value: 'Closed' },
    A4: { value: 'South' },
    B4: { value: 700 },
    C4: { value: 'Open' },
  },
  validations: {},
  filters: [],
  selection: null,
  pivot: null,
};

describe('Sheet sort range', () => {
  it('uses header names and sends the selected range to the sort endpoint', async () => {
    vi.mocked(api.getWorkbook).mockResolvedValue({
      id: 'wb-sort',
      name: 'Sort workbook',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastActiveSheet: 'Sheet1',
      worksheets: ['Sheet1'],
      sheets: [worksheet],
    });
    vi.mocked(api.setSelection).mockResolvedValue(worksheet);
    vi.mocked(api.sortSheet).mockResolvedValue(worksheet);

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/workbooks/wb-sort']}>
        <Routes>
          <Route path="/workbooks/:id" element={<SheetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Sheet1' })).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'A1' }));
    fireEvent.mouseEnter(screen.getByRole('gridcell', { name: 'C4' }));
    fireEvent.mouseUp(screen.getByRole('gridcell', { name: 'C4' }));

    await user.click(screen.getByRole('button', { name: 'Data' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sort range' }));

    const dialog = screen.getByRole('dialog', { name: 'Sort range' });
    const sortBy = within(dialog).getByRole('combobox', { name: 'Sort by' });
    expect(within(sortBy).getByRole('option', { name: 'Region' })).toHaveValue('A');
    expect(within(sortBy).getByRole('option', { name: 'Sales' })).toHaveValue('B');
    await user.selectOptions(sortBy, 'B');
    await user.click(within(dialog).getByLabelText('Data has header row'));
    await user.click(within(dialog).getByRole('button', { name: 'Sort' }));

    await waitFor(() =>
      expect(api.sortSheet).toHaveBeenCalledWith('wb-sort', 'Sheet1', {
        column: 'B',
        direction: 'asc',
        start: 'A1',
        end: 'C4',
        hasHeader: true,
      }),
    );
  });
});
