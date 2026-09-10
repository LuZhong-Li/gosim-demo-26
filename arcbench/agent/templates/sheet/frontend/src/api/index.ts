import axios from 'axios';

export type Cell = { value: number | string; formula?: string; error?: string | null };
export type Worksheet = { name: string; cells: Record<string, Cell> };
export type WorkbookSummary = {
  id: string;
  name: string;
  createdAt: string;
  worksheets: string[];
};
export type WorkbookDetail = WorkbookSummary & { sheets: Worksheet[] };

const client = axios.create({ baseURL: '/api', timeout: 10000 });

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string } | undefined;
    if (payload && payload.error) return payload.error;
  }
  return fallback;
}

export async function listWorkbooks(): Promise<WorkbookSummary[]> {
  const response = await client.get('/workbooks');
  return response.data.workbooks as WorkbookSummary[];
}

export async function createWorkbook(name: string): Promise<WorkbookSummary> {
  const response = await client.post('/workbooks', { name });
  return response.data.workbook as WorkbookSummary;
}

export async function getWorkbook(id: string): Promise<WorkbookDetail> {
  const response = await client.get(`/workbooks/${encodeURIComponent(id)}`);
  return response.data.workbook as WorkbookDetail;
}

export async function renameWorkbook(id: string, name: string): Promise<void> {
  await client.patch(`/workbooks/${encodeURIComponent(id)}`, { name });
}

export async function addWorksheet(id: string, name: string): Promise<void> {
  await client.post(`/workbooks/${encodeURIComponent(id)}/worksheets`, { name });
}

export async function renameWorksheet(id: string, sheet: string, name: string): Promise<void> {
  await client.patch(`/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}`, {
    name,
  });
}

export async function deleteWorksheet(id: string, sheet: string): Promise<void> {
  await client.delete(`/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}`);
}

export async function updateCells(
  id: string,
  sheet: string,
  updates: Record<string, Cell | null>,
): Promise<Worksheet> {
  const response = await client.patch(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/cells`,
    { updates },
  );
  return response.data.sheet as Worksheet;
}

export async function replaceCells(
  id: string,
  sheet: string,
  cells: Record<string, Cell>,
): Promise<Worksheet> {
  const response = await client.put(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/cells`,
    { cells },
  );
  return response.data.sheet as Worksheet;
}

export async function insertRows(
  id: string,
  sheet: string,
  index: number,
  count: number,
  action: 'insert' | 'delete',
): Promise<Worksheet> {
  const response = await client.post(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/rows`,
    { index, count, action },
  );
  return response.data.sheet as Worksheet;
}

export async function insertColumns(
  id: string,
  sheet: string,
  index: number,
  count: number,
  action: 'insert' | 'delete',
): Promise<Worksheet> {
  const response = await client.post(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/columns`,
    { index, count, action },
  );
  return response.data.sheet as Worksheet;
}

export async function sortSheet(
  id: string,
  sheet: string,
  column: string,
  direction: 'asc' | 'desc',
): Promise<Worksheet> {
  const response = await client.post(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/sort`,
    { column, direction },
  );
  return response.data.sheet as Worksheet;
}

export function exportUrl(id: string, sheet: string): string {
  return `/api/workbooks/${encodeURIComponent(id)}/export?sheet=${encodeURIComponent(sheet)}`;
}

export async function importCsv(id: string, sheet: string, csv: string): Promise<Worksheet> {
  const response = await client.post(`/workbooks/${encodeURIComponent(id)}/import`, { sheet, csv });
  return response.data.sheet as Worksheet;
}
