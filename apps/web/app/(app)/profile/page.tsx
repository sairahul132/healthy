"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth/session-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/States";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  const { user } = useSession();

  return (
    <div className="mx-auto max-w-2xl">
      <span className="text-[10.5px] font-bold tracking-[0.14em] text-[var(--color-accent)] uppercase">
        Your account
      </span>
      <h1 className="mt-1 font-display text-2xl font-medium text-[var(--color-text)]">Profile</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="shrink-0 text-[var(--color-accent)]"
        >
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
        Only you can see this. Sensitive fields are optional.
      </p>

      <Card className="mt-7">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c1.2-3.6 4.2-5.5 7-5.5S17.8 16.4 19 20" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <CardTitle>Personal details</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Used to identify you and fill in reports accurately.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>{user ? <ProfileForm user={user} /> : <LoadingState />}</CardContent>
      </Card>

      <Card className="mt-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 3v4M15 3v4M4 11h16M5 7h14a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1z" />
                <path d="M12 14v4M10 16h4" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Are you a doctor?</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Register your professional details to view patient-shared results.
              </p>
            </div>
          </div>
          <Link
            href="/doctor"
            className="shrink-0 text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            Doctor dashboard →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
