import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/api';
import HomePage, { NewWorkbookPage } from '../src/pages/HomePage';

vi.mock('../src/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api')>()),
  createWorkbook: vi.fn(),
  listWorkbooks: vi.fn(),
}));

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workbooks/new" element={<NewWorkbookPage />} />
        <Route path="/workbooks/:id" element={<div>Workbook editor</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('New blank workbook flow', () => {
  it('opens the creation page and creates with the official Create button', async () => {
    vi.mocked(api.listWorkbooks).mockResolvedValue([]);
    vi.mocked(api.createWorkbook).mockResolvedValue({
      id: 'wb-new',
      name: 'Budget',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastActiveSheet: 'Sheet1',
      worksheets: ['Sheet1'],
    });

    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByRole('button', { name: 'New blank workbook' }));

    const name = await screen.findByLabelText('Workbook name');
    await user.type(name, 'Budget');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(api.createWorkbook).toHaveBeenCalledWith('Budget'));
    expect(await screen.findByText('Workbook editor')).toBeInTheDocument();
  });
});
