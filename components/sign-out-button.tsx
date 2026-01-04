"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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
