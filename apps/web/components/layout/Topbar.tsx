"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/auth/session-context";
import { useAccessRequests } from "@/lib/sharing/hooks";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar() {
  const { user, logout } = useSession();
  const { data: pendingRequests } = useAccessRequests(true);
  const pendingCount = pendingRequests?.length ?? 0;
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
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-6 py-3.5 backdrop-blur-sm sm:px-10">
      <Link
        href="/search"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-faint)] transition-colors hover:border-[var(--color-border-strong)] sm:max-w-md"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="shrink-0"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="truncate">Search reports, tests, or health insights&hellip;</span>
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Link
          href="/share"
          aria-label={pendingCount > 0 ? `${pendingCount} pending access requests` : "Notifications"}
          className="relative grid h-9 w-9 place-items-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {pendingCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border border-[var(--color-bg)] bg-[var(--color-danger)]" />
          ) : null}
        </Link>

        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name ?? null} className="h-8.5 w-8.5" />
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {user?.name?.trim() || "Welcome back"}
            </p>
            {user ? (
              <p className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{user.healthyId}</p>
            ) : null}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} isLoading={isLoggingOut}>
          Log out
        </Button>
      </div>
    </header>
  );
}
