import { PremiumAuthShell } from "@/components/layout/PremiumAuthShell";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";

export const metadata = { title: "Log in to Healthy" };

export default function LoginPage() {
  return (
    <PremiumAuthShell
      kicker="Patient login"
      pageHeadline="Your health, finally in one place."
      panelMark="A healthier tomorrow"
      panelHeadline="For you, your family — and everyone you care about."
      panelBody="One private place for every report, result, and visit — nothing shared until you say so."
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
