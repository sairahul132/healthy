"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session-context";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";

const HIGHLIGHTS = [
  { title: "Structured, not stacked", body: "Every report becomes readable data — values, ranges, trends." },
  { title: "Yours to share", body: "Nothing leaves your vault until you choose who sees it, and for how long." },
  { title: "Built like a vault", body: "Encrypted storage, audit trails, and zero-trust access by design." },
];

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--color-bg)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[50rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 65%)",
        }}
      />

      <header className="relative flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Create your vault</Button>
          </Link>
        </nav>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-10 px-4 pb-24 text-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--color-accent)]">
            Private · Personal · Permissioned
          </p>
          <h1 className="font-display mx-auto mt-4 max-w-2xl text-4xl font-medium leading-tight text-[var(--color-text)] sm:text-5xl">
            Your health data.
            <br />
            Your vault. Your permission.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-text-muted)]">
            A private place to keep your lab reports, structured and explained — shared only when
            you say so.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/register">
            <Button>Create your vault</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Log in</Button>
          </Link>
        </div>

        <dl className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] shadow-sm sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <div key={item.title} className="bg-[var(--color-surface)] px-6 py-6 text-left">
              <dt className="font-display text-sm font-medium text-[var(--color-text)]">{item.title}</dt>
              <dd className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
