import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserType = "guest" | "regular";

export type AppSession = {
  user: {
    id: string;
    email: string | null;
    type: UserType;
  };
};

export async function auth(): Promise<AppSession> {
  const supabase = await createSupabaseServerClient(); // ✅ заавал await
  const { data } = await supabase.auth.getUser();

  const user = data.user;

  if (!user) {
    return { user: { id: "guest", email: null, type: "guest" } };
  }

  return { user: { id: user.id, email: user.email ?? null, type: "regular" } };
}
