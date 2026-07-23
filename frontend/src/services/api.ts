// Generic API client for the NourishFest GAS backend.
// One client, parametrized by sheet name, covers all 11 tabs.

const BASE_URL = import.meta.env.VITE_GAS_API_URL as string;

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('VITE_GAS_API_URL is not set — add it to your .env file.');
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { credentials: 'include' });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

async function post<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    // text/plain (not application/json) avoids a CORS preflight OPTIONS
    // request — Apps Script Web Apps don't implement doOptions, so a real
    // preflight would fail. The backend still JSON.parses the body.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...body }),
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

export interface WhoAmI {
  email: string;
  permissions: { module: string; role: 'Admin' | 'Editor' | 'Viewer' }[];
}

export const api = {
  whoami: () => get<WhoAmI>('whoami'),
  listModules: () => get<string[]>('listModules'),

  list: <T>(sheet: string, filters: Record<string, string> = {}) =>
    get<T[]>('list', { sheet, ...filters }),

  getOne: <T>(sheet: string, id: string) => get<T>('get', { sheet, id }),

  create: <T extends { Id: string }>(sheet: string, data: Partial<T>) =>
    post<T>('create', { sheet, data }),

  update: <T extends { Id: string }>(sheet: string, id: string, data: Partial<T>) =>
    post<T>('update', { sheet, id, data }),

  remove: (sheet: string, id: string) => post<{ deleted: string }>('delete', { sheet, id }),

  // Uploads a PDF (already base64-encoded by the caller) into the shared
  // Drive folder and creates its Documents row in one request.
  uploadDocument: <T>(payload: {
    DocType: string;
    Title: string;
    FileName: string;
    MimeType: string;
    FileBase64: string;
    ReferenceNo?: string;
    LinkedModule?: string;
    LinkedRecordId?: string;
    Notes?: string;
  }) => post<T>('uploadDocument', { sheet: 'Documents', data: payload }),

  // AI generation — owner/Admin only (backend re-checks independently of
  // whatever the UI shows). No `sheet` param needed for these two.
  aiGenerateText: (payload: { kind: string; prompt: string }) =>
    post<{ suggestions: string[] }>('aiGenerateText', { data: payload }),

  aiGenerateImage: (payload: { kind: string; prompt: string }) =>
    post<{ imageBase64: string; mimeType: string }>('aiGenerateImage', { data: payload }),
};
