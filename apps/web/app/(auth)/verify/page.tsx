import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { OtpForm } from "@/components/auth/OtpForm";
import { decodeIdentifierFromUrl } from "@/lib/utils/identifier";

export const metadata = { title: "Verify your code" };

interface VerifyPageProps {
  searchParams: Promise<{
    identifier?: string;
    mode?: string;
    expiresIn?: string;
    retryAfter?: string;
  }>;
}

function positiveIntOr(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { identifier: encodedIdentifier, mode, expiresIn, retryAfter } = await searchParams;

  const identifier = encodedIdentifier ? decodeIdentifierFromUrl(encodedIdentifier) : null;
  if (!identifier || (mode !== "register" && mode !== "login")) {
    redirect("/login");
  }

  return (
    <AuthShell
      title="Enter your code"
      description="This confirms it's really you before we open your vault."
      panelKicker="Verify code"
      panelHeadline="Check your messages."
      panelSubtext="We've sent a 6-digit code to confirm it's really you."
    >
      <OtpForm
        identifier={identifier}
        mode={mode}
        initialExpiresInSeconds={positiveIntOr(expiresIn, 60)}
        initialResendCooldownSeconds={positiveIntOr(retryAfter, 30)}
      />
    </AuthShell>
  );
}
