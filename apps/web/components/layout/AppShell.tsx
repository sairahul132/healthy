"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth/session-context";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const { status, refresh } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <LoadingState label="Opening your vault…" />
      </main>
    );
  }

  if (status === "unreachable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
        <ErrorState
          title="Healthify can't be reached"
          description="We couldn't connect to the Healthify API. Check that the backend is running, then try again."
          action={
            <Button size="sm" onClick={() => refresh()}>
              Retry
            </Button>
          }
        />
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <LoadingState label="Redirecting to login…" />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 md:flex md:flex-col">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <Sidebar className="flex-1" />
        <div className="border-t border-[var(--color-border)] p-4">
          <p className="text-[11px] leading-relaxed text-[var(--color-text-faint)]">
            Encrypted vault · Zero-trust access
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-7 md:px-10 md:py-9">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
