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

// ✅ Логин биш бол null буцаана (uuid биш "guest" гэж DB рүү цохихгүй)
export async function auth(): Promise<AppSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) return null;

  // хүсвэл user_metadata.type-оос авч болно, үгүй бол regular
  const metaType = (data.user.user_metadata as any)?.type;
  const type: UserType = metaType === "guest" ? "guest" : "regular";

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      type,
    },
  };
}
