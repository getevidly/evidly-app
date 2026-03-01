import { createClient } from '@supabase/supabase-js';
import { createDemoGuardProxy } from './supabaseGuard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). '
    + 'Copy .env.example to .env.local and fill in your Supabase project values.'
  );
}

const rawClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/** Guarded client — blocks writes when demo mode is active */
export const supabase = createDemoGuardProxy(rawClient);
