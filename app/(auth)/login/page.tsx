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
  sendPasswordReset,
} from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast({ type: "error", description: "Invalid credentials!" });
    } else if (state.status === "invalid_data") {
      toast({ type: "error", description: "Failed validating your submission!" });
    } else if (state.status === "success") {
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

  const handleForgot = async () => {
    if (!email) {
      toast({ type: "error", description: "Email address-аар эхлээд бөглө!" });
      return;
    }
    const res = await sendPasswordReset(email);
    if (res.ok) toast({ type: "success", description: "Reset link илгээлээ!" });
    else toast({ type: "error", description: "Reset link илгээж чадсангүй!" });
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
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Continue with Google
          </button>

          <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>

          <button
            type="button"
            onClick={handleForgot}
            className="mx-auto mt-2 text-center text-gray-600 text-sm hover:underline dark:text-zinc-400"
          >
            Forgot your password?
          </button>

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
