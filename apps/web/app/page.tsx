"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { VaultDoor } from "@/components/layout/VaultDoor";

const DOOR_BADGES = [
  {
    label: "Encrypted",
    sublabel: "At rest & in transit",
    position: "top" as const,
    icon: (
      <path
        d="M12 3l7 3.2v5.3c0 4.3-2.9 7.9-7 9-4.1-1.1-7-4.7-7-9V6.2L12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "Zero-trust",
    sublabel: "Access, by design",
    position: "right" as const,
    icon: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Audit-logged",
    sublabel: "Every access recorded",
    position: "bottom" as const,
    icon: (
      <>
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
];

/** Floats around the door circle — only makes sense once the door itself
 * is big enough (lg+, 420px) that a 160px badge has room to sit beside it
 * without covering the graphic. Below lg, DoorBadgesCompact renders the
 * same information as a plain static row instead — floating absolute
 * badges at a 208-288px door size were overlapping the circle entirely,
 * caught by screenshotting at tablet/mobile widths rather than assuming
 * the percentage math would scale down cleanly. */
function DoorBadge({ badge }: { badge: (typeof DOOR_BADGES)[number] }) {
  const content = (
    <div className="w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_14px_30px_-16px_rgb(var(--shadow-color)/0.5)]">
      <div className="flex items-center gap-1.5 font-display text-[15px] font-medium text-[var(--color-text)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-accent)]">
          {badge.icon}
        </svg>
        {badge.label}
      </div>
      <p className="mt-0.5 text-[10.5px] uppercase tracking-wide text-[var(--color-text-faint)]">{badge.sublabel}</p>
    </div>
  );

  if (badge.position === "top") {
    return <div className="vault-door-badge-top absolute -top-2 -left-10 z-[3] hidden lg:block">{content}</div>;
  }
  if (badge.position === "bottom") {
    return <div className="vault-door-badge-bottom absolute -bottom-1 -left-6 z-[3] hidden lg:block">{content}</div>;
  }
  // "right" is vertically centered via a static wrapper — the entrance
  // animation lives on an inner element so it never overwrites the
  // centering translateY once the animation's fill-mode takes hold.
  return (
    <div className="absolute top-1/2 -right-16 z-[3] hidden -translate-y-1/2 lg:block">
      <div className="vault-door-badge-right">{content}</div>
    </div>
  );
}

function DoorBadgesCompact() {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2 lg:hidden">
      {DOOR_BADGES.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] shadow-sm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-accent)]">
            {badge.icon}
          </svg>
          {badge.label}
        </div>
      ))}
    </div>
  );
}

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

const TRUST_POINTS = [
  {
    title: "Private storage. No public link, ever.",
    body: "Your files live in encrypted, access-controlled storage. There's no public bucket and no shareable URL Healthy generates on its own — reports are only ever readable by you.",
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
    title: "You approve every share.",
    body: "A share only exists because you created it — a specific person, specific categories, an expiry you set. They still verify their own identity with a one-time code before seeing anything.",
    icon: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Every access, logged.",
    body: "Every view, download, and share is written to an audit trail tied to your account, so nothing happens to your data invisibly — including to us.",
    icon: (
      <>
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 12h6M9 15.5h6M9 8.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pt-10 pb-16 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:pt-16 lg:pb-8">
        <div className="relative z-10 flex flex-col items-center text-center lg:w-[46%] lg:shrink-0 lg:items-start lg:text-left">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-accent)] uppercase">
            Private · Personal · Permissioned
          </p>
          <h1 className="font-display mt-4 max-w-lg text-4xl font-medium leading-tight text-[var(--color-text)] sm:text-5xl">
            Your health data.
            <br />
            Your vault. Your permission.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-text-muted)]">
            A private place to keep your lab reports, structured and explained — shared only when
            you say so.
          </p>

          <div className="mt-8 flex gap-3">
            <Link href="/register">
              <Button>Create your vault</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Log in</Button>
            </Link>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-text-faint)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-accent)]">
              <path
                d="M12 3l7 3.2v5.3c0 4.3-2.9 7.9-7 9-4.1-1.1-7-4.7-7-9V6.2L12 3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No password. Just your phone number and a one-time code.
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--color-accent-tint) 0%, transparent 68%)" }}
          />
          <div className="relative w-52 sm:w-72 lg:w-[420px]">
            <VaultDoor className="w-full" />
            {DOOR_BADGES.map((badge) => (
              <DoorBadge key={badge.label} badge={badge} />
            ))}
          </div>
          <DoorBadgesCompact />
        </div>
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Trust / security — the concrete "nothing is public" case, not a slogan. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--color-brand)] to-[var(--color-brand-hover)] px-6 py-20 sm:px-10">
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
          className="pointer-events-none absolute -top-24 -right-24 opacity-[0.1]"
          width="420"
          height="420"
          viewBox="0 0 360 360"
        >
          <circle cx="180" cy="180" r="179" fill="none" stroke="var(--color-accent-bright)" strokeWidth="1" />
          <circle cx="180" cy="180" r="130" fill="none" stroke="var(--color-accent-bright)" strokeWidth="1" />
          <circle cx="180" cy="180" r="80" fill="none" stroke="var(--color-accent-bright)" strokeWidth="1" />
        </svg>

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--color-accent-bright)] uppercase">
            Privacy by design
          </p>
          <h2 className="font-display mx-auto mt-3 max-w-xl text-3xl font-medium text-[var(--color-brand-foreground)] sm:text-4xl">
            Nothing about you is public.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--color-brand-foreground)]/65">
            No public profile, no indexed pages, no default sharing. Your vault is private the
            moment you create it, and stays that way unless you decide otherwise.
          </p>
        </div>

        <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3">
          {TRUST_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-[var(--color-brand-foreground)]/12 bg-[var(--color-brand-foreground)]/[0.05] p-6 text-left"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-accent-bright)]/25 text-[var(--color-accent-bright)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {point.icon}
                </svg>
              </div>
              <h3 className="font-display text-[15px] font-medium text-[var(--color-brand-foreground)]">
                {point.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-brand-foreground)]/60">
                {point.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative flex flex-col items-center gap-2 px-6 py-10 text-center sm:px-10">
        <Logo className="opacity-80" />
        <p className="text-xs text-[var(--color-text-faint)]">
          Private by default. Shared only when you say so.
        </p>
      </footer>
    </main>
  );
}
