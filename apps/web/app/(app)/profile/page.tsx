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
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Profile</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Only you can see this. Sensitive fields are optional.
      </p>

      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>{user ? <ProfileForm user={user} /> : <LoadingState />}</CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Are you a doctor?</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Register your professional details to view patient-shared results.
            </p>
          </div>
          <Link href="/doctor" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
            Doctor dashboard →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
