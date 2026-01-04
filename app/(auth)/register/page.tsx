"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import {
  type RegisterActionState,
  register,
  signInWithGoogle,
} from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: "Account already exists!" });
    } else if (state.status === "failed") {
      toast({ type: "error", description: "Failed to create account!" });
    } else if (state.status === "invalid_data") {
      toast({ type: "error", description: "Failed validating your submission!" });
    } else if (state.status === "success") {
      toast({ type: "success", description: "Account created successfully!" });
      setIsSuccessful(true);
      router.refresh();
      router.push("/");
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail((formData.get("email") as string) ?? "");
    formAction(formData);
  };

  const handleGoogle = async () => {
    const res = await signInWithGoogle();
    if (res.url) window.location.href = res.url;
    else toast({ type: "error", description: "Google sign-in failed!" });
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign Up</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>

        <AuthForm action={handleSubmit} defaultEmail={email}>
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Continue with Google
          </button>

          <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>

          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/login"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
