import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { OtpForm } from "@/components/auth/OtpForm";

export const metadata = { title: "Verify your code" };

interface VerifyPageProps {
  searchParams: Promise<{ identifier?: string; mode?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { identifier, mode } = await searchParams;

  if (!identifier || (mode !== "register" && mode !== "login")) {
    redirect("/login");
  }

  return (
    <AuthShell
      title="Enter your code"
      description="This confirms it's really you before we open your vault."
    >
      <OtpForm identifier={identifier} mode={mode} />
    </AuthShell>
  );
}
