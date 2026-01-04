// /lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ✅ legacy / component-ууд эвдрэхгүй байлгах alias
export const createSupabaseBrowserClient = createClient;
