import { PremiumAuthShell } from "@/components/layout/PremiumAuthShell";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";

export const metadata = { title: "Create your Healthy vault" };

export default function RegisterPage() {
  return (
    <PremiumAuthShell
      kicker="Create an account"
      pageHeadline="Start your private health vault."
      panelMark="Built for your whole family"
      panelHeadline="One place for every report, prescription, and result."
      panelBody="Add family members later — each record stays private to the person it belongs to."
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
