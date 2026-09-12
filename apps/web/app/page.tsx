"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";

const HIGHLIGHTS = [
  {
    title: "Structured, not stacked",
    body: "Every report becomes readable data — values, ranges, trends, not another PDF to scroll through.",
    icon: (
      <path
        d="M5 19V10M12 19V5M19 19v-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Yours to share",
    body: "Nothing leaves your vault until you choose who sees it, and for how long.",
    icon: (
      <>
        <circle cx="7" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="18" r="2.6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9.3 10.8l5.4-3.6M9.3 13.2l5.4 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Built like a vault",
    body: "Encrypted storage, audit trails, and zero-trust access by design.",
    icon: (
      <path
        d="M12 3l7 3.2v5.3c0 4.3-2.9 7.9-7 9-4.1-1.1-7-4.7-7-9V6.2L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Explained, not just numbers",
    body: "Ask Healthy puts every result in plain English — what changed, and whether it matters.",
    icon: (
      <>
        <path
          d="M4 5.5h16v10H9l-4 3.5v-3.5H4v-10z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M18.5 3l.6 1.4L20.5 5l-1.4.6-.6 1.4-.6-1.4L16.5 5l1.4-.6.6-1.4z" fill="currentColor" />
      </>
    ),
  },
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
    <main className="relative flex min-h-screen flex-col bg-[var(--color-bg)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[50rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 65%)" }}
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

      <div className="relative flex flex-1 flex-col items-center justify-center gap-10 px-4 pb-24 pt-10 text-center">
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

        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map((item) => (
            <Card
              key={item.title}
              className="p-6 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-brand)]/30 hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  {item.icon}
                </svg>
              </div>
              <h2 className="font-display text-sm font-medium text-[var(--color-text)]">{item.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{item.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
