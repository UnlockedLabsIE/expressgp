import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client using the service role key.
 * Bypasses RLS — only use in server components, server actions, and API routes.
 * NEVER import this in client components or expose the key to the browser.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local from Supabase Dashboard → Project Settings → API."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
