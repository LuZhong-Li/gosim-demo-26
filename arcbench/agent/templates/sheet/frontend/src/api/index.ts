import axios from 'axios';

export type Cell = { value: number | string; formula?: string; error?: string | null };
export type ValidationRule =
  | { type: 'list'; values: string[] }
  | { type: 'number'; min: number; max: number };
export type GridSelection = { anchor: string; focus: string };
export type FilterConfig = {
  column: string;
  op: 'contains' | 'eq' | 'gt' | 'lt' | 'before' | 'is_empty' | 'is_not_empty';
  value: string;
};
export type PivotConfig = {
  source: string;
  range: { start: string; end: string };
  rowField: string;
  colField: string;
  valueField: string;
  agg: string;
};
export type Worksheet = {
  name: string;
  cells: Record<string, Cell>;
  validations?: Record<string, ValidationRule>;
  filters?: FilterConfig[];
  selection?: GridSelection | null;
  pivot?: PivotConfig | null;
};
export type WorkbookSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastActiveSheet?: string;
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

export async function setSelection(
  id: string,
  sheet: string,
  selection: GridSelection,
): Promise<Worksheet> {
  const response = await client.put(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/selection`,
    selection,
  );
  return response.data.sheet as Worksheet;
}


export async function importCsvFile(name: string, csv: string): Promise<WorkbookSummary> {
  const response = await client.post('/csv-import', { name, csv });
  return response.data.workbook as WorkbookSummary;
}

export async function renameWorkbook(id: string, name: string): Promise<void> {
  await client.patch(`/workbooks/${encodeURIComponent(id)}`, { name });
}

export async function setActiveSheet(id: string, sheet: string): Promise<void> {
  await client.put(`/workbooks/${encodeURIComponent(id)}/active-sheet`, { sheet });
}

export async function addWorksheet(id: string, name: string): Promise<Worksheet> {
  const response = await client.post(`/workbooks/${encodeURIComponent(id)}/worksheets`, { name });
  return response.data.sheet as Worksheet;
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

export async function replaceWorksheet(
  id: string,
  sheet: string,
  worksheet: Worksheet,
): Promise<Worksheet> {
  const response = await client.put(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/state`,
    worksheet,
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
  input: {
    column: string;
    direction: 'asc' | 'desc';
    start: string;
    end: string;
    hasHeader: boolean;
  },
): Promise<Worksheet> {
  const response = await client.post(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/sort`,
    input,
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

export async function setValidations(
  id: string,
  sheet: string,
  range: string,
  rule: ValidationRule,
): Promise<Record<string, ValidationRule>> {
  const response = await client.put(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/validations`,
    { range, rule },
  );
  return response.data.validations as Record<string, ValidationRule>;
}

export async function deleteValidations(
  id: string,
  sheet: string,
  range: string,
): Promise<Record<string, ValidationRule>> {
  const response = await client.delete(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/validations`,
    { data: { range } },
  );
  return response.data.validations as Record<string, ValidationRule>;
}

export async function setFilters(
  id: string,
  sheet: string,
  filters: FilterConfig[],
): Promise<FilterConfig[]> {
  const response = await client.put(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/filters`,
    { filters },
  );
  return response.data.filters as FilterConfig[];
}

export async function createPivot(
  id: string,
  input: { source: string; start: string; end: string; name?: string },
): Promise<{ sheet: Worksheet; worksheets: string[] }> {
  const response = await client.post(`/workbooks/${encodeURIComponent(id)}/pivot`, input);
  return response.data;
}

export async function applyPivot(
  id: string,
  sheet: string,
  input: { rowField: string; colField: string; valueField: string; agg: string },
): Promise<Worksheet> {
  const response = await client.put(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/pivot`,
    input,
  );
  return response.data.sheet as Worksheet;
}

export async function refreshPivot(id: string, sheet: string): Promise<Worksheet> {
  const response = await client.post(
    `/workbooks/${encodeURIComponent(id)}/worksheets/${encodeURIComponent(sheet)}/pivot/refresh`,
  );
  return response.data.sheet as Worksheet;
}


