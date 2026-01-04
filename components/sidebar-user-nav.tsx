"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { createClient } from "@/lib/supabase/client";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

type MinimalUser = {
  id: string;
  email: string | null;
};

export function SidebarUserNav() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    "loading"
  );
  const [user, setUser] = useState<MinimalUser | null>(null);

  // Supabase user-г client дээрээс авч байна
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !data.user) {
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        setUser({
          id: data.user.id,
          email: data.user.email ?? null,
        });
        setStatus("authenticated");
      } catch {
        if (!mounted) return;
        setUser(null);
        setStatus("unauthenticated");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isGuest = useMemo(() => {
    return guestRegex.test(user?.email ?? "");
  }, [user?.email]);

  const handleAuthClick = async () => {
    if (status === "loading") {
      toast({
        type: "error",
        description: "Checking authentication status, please try again!",
      });
      return;
    }

    // Guest гэж тооцоод login руу явуулна
    if (status !== "authenticated" || !user || isGuest) {
      router.push("/login");
      return;
    }

    // Жинхэнэ user бол sign out
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // UI refresh хийхэд хамгийн найдвартай нь
      window.location.href = "/";
    } catch {
      toast({
        type: "error",
        description: "Failed to sign out. Please try again.",
      });
    }
  };

  const avatarSeed = user?.email ?? "guest";

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
                  alt={user?.email ?? "User Avatar"}
                  className="rounded-full"
                  height={24}
                  src={`https://avatar.vercel.sh/${encodeURIComponent(avatarSeed)}`}
                  width={24}
                />
                <span className="truncate" data-testid="user-email">
                  {status === "authenticated" && user?.email
                    ? isGuest
                      ? "Guest"
                      : user.email
                    : "Guest"}
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
              onSelect={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="w-full cursor-pointer"
                onClick={handleAuthClick}
                type="button"
              >
                {status === "authenticated" && user && !isGuest
                  ? "Sign out"
                  : "Login to your account"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
