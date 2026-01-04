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

    // Зарим тохиргоонд email confirm шаардаж болно (data.user байж болно/байхгүй байж болно)
    if (!data.user && !data.session) {
      // Email confirmation ON байвал session үүсэхгүй байх боломжтой
      // Энэ тохиолдолд "success" гэж үзээд user-д email check хийхийг хэлдэг UI байх ёстой
      return { status: "success" };
    }

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) return { status: "invalid_data" };
    return { status: "failed" };
  }
};

// ---------- Google OAuth ----------

export const signInWithGoogle = async (): Promise<{ url?: string }> => {
  try {
    const supabase = await createSupabaseServerClient();

    // Vercel дээр NEXT_PUBLIC_SITE_URL = https://oschat.vercel.app гэх мэт
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL?.startsWith("http")
        ? process.env.VERCEL_URL
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "";

    const redirectTo = baseUrl ? `${baseUrl}/auth/callback` : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (error) return {};
    return { url: data.url };
  } catch {
    return {};
  }
};

// ---------- Sign out ----------

export const signOut = async (): Promise<{ ok: boolean }> => {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

// ---------- Forgot password (email) ----------

const forgotSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordState = {
  status: "idle" | "success" | "failed" | "invalid_data";
};

export const forgotPassword = async (
  _: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> => {
  try {
    const validated = forgotSchema.parse({
      email: formData.get("email"),
    });

    const supabase = await createSupabaseServerClient();

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL?.startsWith("http")
        ? process.env.VERCEL_URL
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "";

    // Reset link очих хуудас (чи дараа нь page хийж болно)
    // Дефолт: /reset-password
    const redirectTo = baseUrl ? `${baseUrl}/reset-password` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: redirectTo || undefined,
    });

    if (error) return { status: "failed" };
    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) return { status: "invalid_data" };
    return { status: "failed" };
  }
};
