"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth/session-context";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { LogoBlock } from "./Logo";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, status, refresh } = useSession();
  const router = useRouter();
  const memberSinceYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;

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
          title="Healthy can't be reached"
          description="We couldn't connect to the Healthy API. Check that the backend is running, then try again."
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
      <aside className="relative hidden w-[235px] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[var(--color-brand)] to-[var(--color-brand-hover)] shadow-[10px_0_32px_-16px_rgb(var(--shadow-color)/0.4)] md:flex">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-accent-bright) 45%, var(--color-accent-bright) 55%, transparent)",
          }}
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -bottom-24 opacity-[0.12]"
          width="280"
          height="280"
          viewBox="0 0 360 360"
        >
          <circle cx="180" cy="180" r="179" fill="none" stroke="var(--color-accent-bright)" strokeWidth="1" />
          <circle cx="180" cy="180" r="130" fill="none" stroke="var(--color-accent-bright)" strokeWidth="1" />
          <circle cx="180" cy="180" r="80" fill="none" stroke="var(--color-accent-bright)" strokeWidth="1" />
        </svg>

        <div className="relative px-5 py-6">
          <LogoBlock inverted />
        </div>
        <Sidebar className="relative flex-1" />
        <div className="relative p-4">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-brand-foreground)]/15 bg-[var(--color-brand-foreground)]/[0.06] px-4.5 py-4">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              className="pointer-events-none absolute -right-3.5 -bottom-3.5 h-16 w-16 text-[var(--color-accent-bright)] opacity-30"
            >
              <path
                d="M56 8C40 8 22 18 22 40c0 6 2 10 2 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path
                d="M24 50c6-16 16-26 32-32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
            {memberSinceYear ? (
              <p className="relative text-[9.5px] font-semibold tracking-[0.14em] text-[var(--color-accent-bright)] uppercase">
                Member since {memberSinceYear}
              </p>
            ) : null}
            <p className="relative mt-1.5 font-display text-[17px] leading-tight font-medium text-[var(--color-brand-foreground)]">
              Better Care
              <br />
              Together
            </p>
            <p className="relative mt-2 max-w-[15ch] text-[12px] leading-relaxed text-[var(--color-brand-foreground)]/55">
              Small steps today for a healthier tomorrow
            </p>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="relative mt-2.5 h-4 w-4 text-[var(--color-accent-bright)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M12 20.5s-7.5-4.6-10-9.3C.5 7.7 2.4 4 6 4c2.2 0 3.8 1.2 6 4 2.2-2.8 3.8-4 6-4 3.6 0 5.5 3.7 4 7.2-2.5 4.7-10 9.3-10 9.3Z" />
            </svg>
          </div>
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
