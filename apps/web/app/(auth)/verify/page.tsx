import { redirect } from "next/navigation";
import { PremiumAuthShell } from "@/components/layout/PremiumAuthShell";
import { OtpForm } from "@/components/auth/OtpForm";
import { decodeIdentifierFromUrl, maskIdentifier } from "@/lib/utils/identifier";

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
    <PremiumAuthShell
      kicker="Verify code"
      pageHeadline="Check your messages."
      panelMark="Almost there"
      panelHeadline="We've sent a 6-digit code to confirm it's really you."
      panelBody="This keeps your vault yours — nobody else can open it, even with your phone."
      panelBadge={
        <span className="font-mono inline-flex items-center rounded-full border border-[var(--color-brand-foreground)]/30 px-3.5 py-1.5 text-[13px] text-[var(--color-brand-foreground)]">
          {maskIdentifier(identifier)}
        </span>
      }
      formTitle="Enter your code"
      formDescription="This confirms it's really you before we open your vault."
      headerCtaLabel="Wrong number?"
      headerCtaHref={mode === "register" ? "/register" : "/login"}
    >
      <OtpForm
        identifier={identifier}
        mode={mode}
        initialExpiresInSeconds={positiveIntOr(expiresIn, 60)}
        initialResendCooldownSeconds={positiveIntOr(retryAfter, 30)}
      />
    </PremiumAuthShell>
  );
}
