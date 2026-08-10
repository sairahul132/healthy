import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { IdentifierForm } from "@/components/auth/IdentifierForm";

export const metadata = { title: "Create your Healthify vault" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your Healthify vault"
      description="No password needed — we'll send a one-time code to verify it's you."
      footer={
        <span className="text-[var(--color-text-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--color-brand)] hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <IdentifierForm mode="register" />
    </AuthShell>
  );
}
