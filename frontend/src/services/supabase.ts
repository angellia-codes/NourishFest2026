import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — add them to your .env file.');
}

// The anon key is a public client key, not a secret — every row it can
// reach is decided by the RLS policies in supabase/schema.sql, not by
// hiding this value.
export const supabase = createClient(url, anonKey);
