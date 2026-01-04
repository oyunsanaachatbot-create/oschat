"use client";

import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { guestRegex } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOut as serverSignOut } from "@/app/(auth)/actions";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

type SidebarUserNavProps = {
  user: { email?: string | null };
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export function SidebarUserNav({ user }: SidebarUserNavProps) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(user?.email ?? null);

  const isGuest = useMemo(() => guestRegex.test(email ?? ""), [email]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    let unsub: (() => void) | null = null;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionEmail = data.session?.user?.email ?? null;

      setEmail(sessionEmail ?? user?.email ?? null);
      setStatus(data.session ? "authenticated" : "unauthenticated");

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextEmail = session?.user?.email ?? null;
        setEmail(nextEmail ?? user?.email ?? null);
        setStatus(session ? "authenticated" : "unauthenticated");
      });

      unsub = () => sub.subscription.unsubscribe();
    };

    init();

    return () => {
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === "loading" ? (
              <SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex flex-row gap-2">
                  <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                  <span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                data-testid="user-nav-button"
              >
                <Image
                  alt={email ?? "User Avatar"}
                  className="rounded-full"
                  height={24}
                  src={`https://avatar.vercel.sh/${email ?? "user"}`}
                  width={24}
                />
                <span className="truncate" data-testid="user-email">
                  {isGuest ? "Guest" : email}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width)"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              data-testid="user-nav-item-theme"
              onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="w-full cursor-pointer"
                type="button"
                onClick={async () => {
                  if (status === "loading") {
                    toast({
                      type: "error",
                      description: "Checking authentication status, please try again!",
                    });
                    return;
                  }

                  if (isGuest || status === "unauthenticated") {
                    router.push("/login");
                    return;
                  }

                  await serverSignOut(); // ✅ Supabase signOut (server action)
                  router.refresh();
                  router.push("/login");
                }}
              >
                {isGuest || status === "unauthenticated" ? "Login to your account" : "Sign out"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
