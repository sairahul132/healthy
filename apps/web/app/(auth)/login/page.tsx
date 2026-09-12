import { PremiumAuthShell } from "@/components/layout/PremiumAuthShell";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";

export const metadata = { title: "Log in to Healthy" };

export default function LoginPage() {
  return (
    <PremiumAuthShell
      kicker="Patient login"
      heroTitle="Your health, finally in one place."
      heroSubtext="For you, your family — and everyone you care about."
      formTitle="Welcome back"
      formDescription="Enter your mobile number and we'll send a one-time code to sign in."
      headerQuestion="New to Healthy?"
      headerCtaLabel="Create a vault"
      headerCtaHref="/register"
    >
      <PhoneLoginForm mode="login" />
    </PremiumAuthShell>
  );
}
