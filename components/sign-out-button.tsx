"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function SignOutButton({
  className = "w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md",
}: {
  className?: string;
}) {
  const router = useRouter();

  const onClick = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <button type="button" onClick={onClick} className={className}>
      Sign out
    </button>
  );
}
