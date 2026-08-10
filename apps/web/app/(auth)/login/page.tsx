import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { IdentifierForm } from "@/components/auth/IdentifierForm";

export const metadata = { title: "Log in to Healthy" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in to Healthy"
      description="We'll send a one-time code to verify it's you — no password required."
      footer={
        <span className="text-[var(--color-text-muted)]">
          New to Healthy?{" "}
          <Link href="/register" className="font-medium text-[var(--color-brand)] hover:underline">
            Create a vault
          </Link>
        </span>
      }
    >
      <IdentifierForm mode="login" />
    </AuthShell>
  );
}
