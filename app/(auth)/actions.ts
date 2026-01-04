"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) return { status: "failed" };
    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) return { status: "invalid_data" };
    return { status: "failed" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return { status: "user_exists" };
      }
      return { status: "failed" };
    }

    if (!data.user) return { status: "failed" };
    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) return { status: "invalid_data" };
    return { status: "failed" };
  }
};

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient();

  // Vercel дээр зөв URL үүсгэх
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000");

  const redirectTo = `${siteUrl}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      // Google account chooser гаргана
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) return { ok: false as const };
  return { ok: true as const, url: data.url };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false as const };
  return { ok: true as const };
}
