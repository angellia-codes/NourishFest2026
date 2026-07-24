// API client for the NourishFest GAS backend (entity-based contract).
import type {
  CurrentUser,
  DashboardData,
  EntityName,
  FinanceDashboardData,
  Idea,
} from '../types';

const BASE_URL = import.meta.env.VITE_GAS_API_URL as string;

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('VITE_GAS_API_URL is not set — add it to your .env file.');
}

interface Envelope<T> {
  ok: boolean;
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
  const json = (await res.json()) as Envelope<T>;
  if (!json.ok) throw new Error(json.error || 'Request failed');
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
  const json = (await res.json()) as Envelope<T>;
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

export const api = {
  me: () => get<CurrentUser>('me'),

  list: <T>(entity: EntityName, eventId?: string) =>
    get<T[]>('list', { entity, ...(eventId ? { eventId } : {}) }),

  dashboard: () => get<DashboardData>('dashboard'),
  financeDashboard: () => get<FinanceDashboardData>('financeDashboard'),

  create: <T>(entity: EntityName, data: Partial<T>) => post<T>('create', { entity, data }),
  update: <T>(entity: EntityName, id: string, data: Partial<T>) => post<T>('update', { entity, id, data }),
  remove: (entity: EntityName, id: string) => post<{ deleted: string }>('delete', { entity, id }),

  vote: (ideaId: string) => post<Idea>('vote', { entity: 'Ideas', id: ideaId }),

  uploadFile: (payload: { base64: string; filename: string; mimeType: string }) =>
    post<{ url: string; id: string }>('uploadFile', { data: payload }),
};
