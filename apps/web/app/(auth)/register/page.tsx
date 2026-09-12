import { PremiumAuthShell } from "@/components/layout/PremiumAuthShell";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";

export const metadata = { title: "Create your Healthy vault" };

export default function RegisterPage() {
  return (
    <PremiumAuthShell
      kicker="Create an account"
      heroTitle="Start your private health vault."
      heroSubtext="One place for every report, prescription, and result — for your whole family."
      formTitle="Create your vault"
      formDescription="No password needed — enter your mobile number and we'll send a one-time code."
      headerQuestion="Already have an account?"
      headerCtaLabel="Log in"
      headerCtaHref="/login"
    >
      <PhoneLoginForm mode="register" />
    </PremiumAuthShell>
  );
}
