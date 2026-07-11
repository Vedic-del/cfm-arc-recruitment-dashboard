// This module must never reach the browser bundle: it holds the Supabase
// service-role key, which bypasses Row Level Security. `server-only` makes the
// build fail loudly if a Client Component ever imports it (all current db
// access is server-side; client components only import *types* from here).
import 'server-only';
import { createClient } from '@supabase/supabase-js';

// URL isn't secret; the key is. Prefer the server-only service-role key so the
// app is the single trusted gateway to the data. Falls back to the anon key so
// nothing breaks before SUPABASE_SERVICE_ROLE_KEY is set in the environment —
// but the app is only fully locked down once RLS is enabled AND this key is set.
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon key. ' +
      'Set the service-role key and enable RLS to lock down the database.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
