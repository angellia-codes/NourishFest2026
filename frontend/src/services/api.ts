// API client for the NourishFest Supabase backend.
//
// The method surface here is deliberately identical to the old Apps Script
// client's, so useEntityData, PermissionContext, Dashboard, FinanceDashboard,
// useFileUpload and useAIGenerate did not change when the backend did. Adding
// a Supabase-specific concept to this file (a query builder, a realtime
// channel) means leaking it into all six.
//
// There is no idToken plumbing any more: the Supabase client attaches the
// session to every request itself, and permissions are enforced by RLS in the
// database rather than by a check in the API layer.
import { supabase } from './supabase';
import { ID_FIELD, type CurrentUser, type DashboardData, type EntityName, type FinanceDashboardData } from '../types';

const BUCKET = 'attachments';

// PostgrestError -> Error, so the existing TanStack Query error paths and the
// error text every screen already renders keep working unchanged.
function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const api = {
  me: async (): Promise<CurrentUser> => unwrap(await supabase.rpc('me')),

  list: async <T>(entity: EntityName, eventId?: string): Promise<T[]> => {
    // eventId is the only server-side filter the old backend supported and
    // the only one callers pass; everything else is filtered client-side.
    const query = supabase.from(entity).select('*');
    return unwrap(await (eventId ? query.eq('EventID', eventId) : query)) ?? [];
  },

  dashboard: async (): Promise<DashboardData> => unwrap(await supabase.rpc('dashboard')),
  financeDashboard: async (): Promise<FinanceDashboardData> => unwrap(await supabase.rpc('finance_dashboard')),

  // `as never` on the payloads: there are no generated Database types (the
  // schema lives in supabase/schema.sql, not a generated .ts), so the
  // client's row type is `any` and its insert/update generics can't be
  // reconciled with our own <T>. The exported signatures above are what
  // callers are actually checked against.
  create: async <T>(entity: EntityName, data: Partial<T>): Promise<T> =>
    unwrap(await supabase.from(entity).insert(data as never).select().single()),

  update: async <T>(entity: EntityName, id: string, data: Partial<T>): Promise<T> =>
    unwrap(await supabase.from(entity).update(data as never).eq(ID_FIELD[entity], id).select().single()),

  remove: async (entity: EntityName, id: string): Promise<{ deleted: string }> => {
    const { error } = await supabase.from(entity).delete().eq(ID_FIELD[entity], id);
    if (error) throw new Error(error.message);
    return { deleted: id };
  },

  uploadFile: async (file: File): Promise<{ url: string; id: string }> => {
    // Randomised path: two people uploading "quotation.pdf" must not
    // overwrite each other, which a plain filename key would allow.
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, id: path };
  },

  aiGenerate: async (kind: 'theme' | 'tagline' | 'idea', prompt: string): Promise<{ suggestions: string[] }> => {
    const { data, error } = await supabase.functions.invoke('ai-generate', { body: { kind, prompt } });
    if (error) {
      // functions.invoke() collapses every non-2xx into the same generic
      // "non-2xx status code" message. The real reason — not a committee
      // member, a missing key, a Gemini failure — is in the response
      // body, so dig it out or the user sees nothing useful.
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    return data as { suggestions: string[] };
  },
};
