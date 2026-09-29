import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import SheetPage from '../src/pages/SheetPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getWorkbook: vi.fn(),
  setFilters: vi.fn(),
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

function renderWith(filters = worksheet.filters) {
  vi.mocked(api.getWorkbook).mockResolvedValue({
    id: 'wb-filter',
    name: 'Filter workbook',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastActiveSheet: 'Sheet1',
    worksheets: ['Sheet1'],
    sheets: [{ ...worksheet, filters }],
  });
  vi.mocked(api.setFilters).mockImplementation(async (_id, _sheet, filters) => filters);

  return render(
    <MemoryRouter initialEntries={['/workbooks/wb-filter']}>
      <Routes>
        <Route path="/workbooks/:id" element={<SheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Sheet filters', () => {
  it('names the grid and applies value filters from a header button', async () => {
    const user = userEvent.setup();
    renderWith();

    await waitFor(() => expect(screen.getByRole('grid', { name: 'Worksheet grid' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Filter Region' }));

    const dialog = screen.getByRole('dialog', { name: 'Filter Region' });
    await user.click(within(dialog).getByRole('checkbox', { name: 'East' }));
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(api.setFilters).toHaveBeenCalledWith('wb-filter', 'Sheet1', [
        { column: 'A', op: 'eq', value: 'East' },
      ]),
    );
  });

  it('combines filters on different columns with AND', async () => {
    const user = userEvent.setup();
    renderWith([
      { column: 'A', op: 'eq', value: 'East' },
      { column: 'B', op: 'gt', value: '1000' },
    ]);

    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument());
    expect(screen.getByRole('gridcell', { name: 'A2' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('gridcell', { name: 'A3' })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Filter Sales' }));
    const dialog = screen.getByRole('dialog', { name: 'Filter Sales' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Condition' }), 'gt');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Value' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Value' }), '900');
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(api.setFilters).toHaveBeenCalledWith('wb-filter', 'Sheet1', [
        { column: 'A', op: 'eq', value: 'East' },
        { column: 'B', op: 'gt', value: '900' },
      ]),
    );
  });
});
