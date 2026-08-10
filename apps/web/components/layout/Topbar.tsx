"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/auth/session-context";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 px-6 py-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Avatar name={user?.name ?? null} className="h-9 w-9" />
        <div>
          <p className="text-sm font-semibold leading-tight text-[var(--color-text)]">
            {user?.name?.trim() ? `Hi, ${user.name.split(" ")[0]}` : "Welcome back"}
          </p>
          {user ? (
            <p className="font-mono text-[11px] leading-tight text-[var(--color-text-faint)]">
              {user.healthyId}
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout} isLoading={isLoggingOut}>
        Log out
      </Button>
    </header>
  );
}
