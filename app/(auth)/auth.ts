// /app/(auth)/auth.ts
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
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return { user: { id: "guest", email: null, type: "guest" } };
  }

  // login хийсэн хүн бол regular гэж үзнэ
  return { user: { id: user.id, email: user.email ?? null, type: "regular" } };
}
