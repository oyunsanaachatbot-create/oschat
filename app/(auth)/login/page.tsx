"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import {
  type LoginActionState,
  login,
  signInWithGoogle,
} from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(login, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "failed") {
      toast({ type: "error", description: "Invalid credentials!" });
    } else if (state.status === "invalid_data") {
      toast({ type: "error", description: "Failed validating your submission!" });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      // Supabase cookie session server-side дээр set болно.
      router.refresh();
      router.push("/"); // хүсвэл /chat гэж сольж болно
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  const handleGoogle = async () => {
    // server action нь OAuth redirect URL буцаана
    const res = await signInWithGoogle();
    if (res?.url) window.location.href = res.url;
    else toast({ type: "error", description: "Google sign-in failed!" });
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
          {/* UI дээр чинь “Continue with Google” товч байгаа — яг тэрийг ажиллуулж өгнө */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Continue with Google
          </button>

          {/* “OR” шугам чинь AuthForm дотор байгаа бол хэвээрээ үлдэнэ */}

          <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>

          <div className="mt-3 text-center">
            <Link
              className="text-sm text-gray-600 hover:underline dark:text-zinc-400"
              href="/forgot-password"
            >
              Forgot your password?
            </Link>
          </div>

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
        </AuthForm>
      </div>
    </div>
  );
}
