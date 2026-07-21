import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role client: SERVER ONLY. Bypasses RLS. Used for webhook handlers
// and public payment pages where there is no user session.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
