import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import SheetPage from '../src/pages/SheetPage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  deleteValidations: vi.fn(),
  getWorkbook: vi.fn(),
  updateCells: vi.fn(),
}));

const worksheet = {
  name: 'Sheet1',
  cells: {
    A1: { value: 'open' },
    B3: { value: 50 },
  },
  validations: {
    A1: { type: 'list' as const, values: ['open', 'closed'] },
    B3: { type: 'number' as const, min: 0, max: 100 },
  },
  filters: [],
  selection: null,
  pivot: null,
};

function mockWorkbook() {
  vi.mocked(api.getWorkbook).mockResolvedValue({
    id: 'wb-validation',
    name: 'Validation workbook',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastActiveSheet: 'Sheet1',
    worksheets: ['Sheet1'],
    sheets: [worksheet],
  });
  vi.mocked(api.updateCells).mockResolvedValue(worksheet);
}

function renderSheet() {
  return render(
    <MemoryRouter initialEntries={['/workbooks/wb-validation']}>
      <Routes>
        <Route path="/workbooks/:id" element={<SheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openValidationDialog() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Data' }));
  await user.click(screen.getByRole('menuitem', { name: 'Data validation' }));
  return user;
}

describe('Sheet data validation', () => {
  it('prefills an existing rule and deletes it with Delete rule', async () => {
    mockWorkbook();
    renderSheet();
    const user = await openValidationDialog();

    const dialog = screen.getByRole('dialog', { name: 'Data validation' });
    expect(within(dialog).getByLabelText('Allowed values')).toHaveValue('open,closed');
    const deleteRule = within(dialog).getByRole('button', { name: 'Delete rule' });
    await user.click(deleteRule);

    const caller = api as unknown as { deleteValidations: ReturnType<typeof vi.fn> };
    await waitFor(() =>
      expect(caller.deleteValidations).toHaveBeenCalledWith('wb-validation', 'Sheet1', 'A1'),
    );
  });

  it('rejects an invalid dropdown value without writing the cell', async () => {
    mockWorkbook();
    renderSheet();
    const input = await screen.findByRole('textbox', { name: 'Formula bar' });

    fireEvent.change(input, { target: { value: 'pending' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(api.updateCells).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Please select one of the following values: open, closed'),
    ).toBeInTheDocument();
  });

  it('uses the official boundary message for a rejected number', async () => {
    mockWorkbook();
    renderSheet();
    const input = await screen.findByRole('spinbutton', { name: 'Cell B3' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '101' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(api.updateCells).not.toHaveBeenCalled();
    expect(await screen.findByText('Please enter a number from 0 to 100')).toBeInTheDocument();
  });
});
