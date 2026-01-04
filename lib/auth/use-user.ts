"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ClientUser = { id: string; email: string | null } | null;

export function useUser() {
  const [user, setUser] = useState<ClientUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(
        data.user ? { id: data.user.id, email: data.user.email ?? null } : null
      );
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}

export async function supabaseSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
