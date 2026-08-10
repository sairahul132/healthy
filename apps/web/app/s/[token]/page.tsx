import { RecipientFlow } from "@/components/sharing/recipient/RecipientFlow";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export const metadata = { title: "Protected Health Record — Healthy" };

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  return <RecipientFlow token={token} />;
}
