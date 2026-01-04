"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";

export const SignOutForm = () => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.refresh();
        router.push("/login");
      }}
    >
      Sign out
    </button>
  );
};
