import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import SheetPage from '../src/pages/SheetPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  getWorkbook: vi.fn(),
  replaceCells: vi.fn(),
  replaceWorksheet: vi.fn(),
  setFilters: vi.fn(),
  setValidations: vi.fn(),
}));

function mockApi() {
  return {
    getWorkbook: vi.mocked(api.getWorkbook),
    replaceCells: vi.mocked(api.replaceCells),
    replaceWorksheet: vi.mocked(api.replaceWorksheet) as unknown as ReturnType<typeof vi.fn>,
    setFilters: vi.mocked(api.setFilters),
    setValidations: vi.mocked(api.setValidations),
  };
}

function renderSheet(workbookId: string) {
  return render(
    <MemoryRouter initialEntries={[`/workbooks/${workbookId}`]}>
      <Routes>
        <Route path="/workbooks/:id" element={<SheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openDataTool(name: 'Create filter' | 'Data validation') {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Data' }));
  await user.click(screen.getByRole('menuitem', { name }));
}

describe('Sheet history and persistence', () => {
  it('persists filters and undo restores the complete prior worksheet state', async () => {
    const mocks = mockApi();
    let worksheet = {
      name: 'Sheet1',
      cells: { A1: { value: 'Region' } },
      validations: {},
      filters: [],
      selection: null,
      pivot: null,
    };
    mocks.getWorkbook.mockImplementation(async () => ({
      id: 'wb-filter',
      name: 'Filter workbook',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastActiveSheet: 'Sheet1',
      worksheets: ['Sheet1'],
      sheets: [worksheet],
    }));
    mocks.setFilters.mockImplementation(async () => [
      { column: 'A', op: 'contains' as const, value: 'Open' },
    ]);
    mocks.replaceWorksheet.mockImplementation(async () => worksheet);
    renderSheet('wb-filter');

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sheet1' })).toBeInTheDocument());
    await openDataTool('Create filter');
    const dialog = screen.getByRole('dialog', { name: 'Create filter' });
    await user.type(within(dialog).getByLabelText('Filter column'), 'A');
    await user.type(within(dialog).getByLabelText('Value'), 'Open');
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(mocks.setFilters).toHaveBeenCalledWith('wb-filter', 'Sheet1', [
        { column: 'A', op: 'contains', value: 'Open' },
      ]),
    );
    worksheet = {
      ...worksheet,
      filters: [{ column: 'A', op: 'contains' as const, value: 'Open' }],
    };

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    await waitFor(() =>
      expect(mocks.replaceWorksheet).toHaveBeenCalledWith('wb-filter', 'Sheet1', {
        name: 'Sheet1',
        cells: { A1: { value: 'Region' } },
        validations: {},
        filters: [],
        selection: null,
        pivot: null,
      }),
    );
  });

  it('undo restores validations as part of the worksheet snapshot', async () => {
    const mocks = mockApi();
    let worksheet = {
      name: 'Sheet1',
      cells: { A1: { value: 'Open' } },
      validations: {},
      filters: [],
      selection: null,
      pivot: null,
    };
    mocks.getWorkbook.mockImplementation(async () => ({
      id: 'wb-validation',
      name: 'Validation workbook',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastActiveSheet: 'Sheet1',
      worksheets: ['Sheet1'],
      sheets: [worksheet],
    }));
    mocks.setValidations.mockImplementation(async () => {
      worksheet = {
        ...worksheet,
        validations: { A1: { type: 'list' as const, values: ['Open', 'Closed'] } },
      };
      return worksheet.validations;
    });
    mocks.replaceWorksheet.mockImplementation(async () => worksheet);
    renderSheet('wb-validation');

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sheet1' })).toBeInTheDocument());
    await openDataTool('Data validation');
    const dialog = screen.getByRole('dialog', { name: 'Data validation' });
    await user.type(within(dialog).getByLabelText('Allowed values'), 'Open,Closed');
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(mocks.setValidations).toHaveBeenCalledWith(
        'wb-validation',
        'Sheet1',
        'A1',
        { type: 'list', values: ['Open', 'Closed'] },
      ),
    );

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    await waitFor(() =>
      expect(mocks.replaceWorksheet).toHaveBeenCalledWith('wb-validation', 'Sheet1', {
        name: 'Sheet1',
        cells: { A1: { value: 'Open' } },
        validations: {},
        filters: [],
        selection: null,
        pivot: null,
      }),
    );
  });
});
