"use client";

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
    </div>
  );
}
