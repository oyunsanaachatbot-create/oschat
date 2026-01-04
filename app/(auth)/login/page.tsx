"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(login, {
    status: "idle",
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: router is stable ref
  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: "Invalid credentials!",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        toast({
          type: "error",
          description: error.message || "Google sign-in failed.",
        });
        setIsGoogleLoading(false);
      }
      // success -> redirect (code won't continue)
    } catch {
      toast({
        type: "error",
        description: "Google sign-in failed.",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign In</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>

        <AuthForm action={handleSubmit} defaultEmail={email}>
          {/* Google button (button type to avoid form submit) */}
          <SubmitButton
            isSuccessful={false}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleGoogleSignIn();
            }}
            disabled={isGoogleLoading}
            // зураг шиг "цагаан" стиль хэрэгтэй бол className-ийг үлдээж болно (байхгүй бол Button default стиль орно)
            className="w-full"
          >
            {isGoogleLoading ? "Signing in..." : "Continue with Google"}
          </SubmitButton>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Email+password submit */}
          <SubmitButton isSuccessful={isSuccessful} className="w-full">
            Sign in
          </SubmitButton>

          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/register"
            >
              Sign up
            </Link>
            {" for free."}
          </p>

          <div className="text-center">
            <Link
              className="text-gray-600 text-sm hover:underline dark:text-zinc-400"
              href="/reset-password"
            >
              Forgot your password?
            </Link>
          </div>
        </AuthForm>
      </div>
    </div>
  );
}
