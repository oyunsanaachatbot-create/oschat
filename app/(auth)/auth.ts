import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// entitlements.ts дээр байгаа key-үүдтэй тааруулна
export type UserType = "guest" | "regular";

export type AppSession = {
  user: {
    id: string;
    email: string | null;
    type: UserType;
  };
};

// ❗ Guest үед fake "guest" id буцаахгүй. Шууд null буцаана.
export async function auth(): Promise<AppSession | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) return null;

  const u = data.user;
  const metaType = (u.user_metadata as any)?.type;

  return {
    user: {
      id: u.id,
      email: u.email ?? null,
      type: (metaType ?? "regular") as UserType,
    },
  };
}
