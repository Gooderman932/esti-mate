// ============================================================
// ESTI-MATE — Supabase Client
// Connects to the homecare-pro project (em_ prefixed tables)
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://osjikoenxtmedyijjfia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zamlrb2VueHRtZWR5aWpqZmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjQ2NTQsImV4cCI6MjA4NzU0MDY1NH0.yG7VsQxFmlLLAWcEIkVBQWLZFw4VGCgt6xDcNiFgT5w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
