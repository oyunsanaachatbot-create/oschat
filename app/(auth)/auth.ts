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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  // Auth алдаа гарсан ч guest гэж үзнэ (UI/route унахгүй)
  const user = !error ? data.user : null;

  if (!user) {
    return { user: { id: "guest", email: null, type: "guest" } };
  }

  return { user: { id: user.id, email: user.email ?? null, type: "regular" } };
}
