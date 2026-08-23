"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as sharingApi from "@/lib/api/sharing";
import { ApiError } from "@/lib/api/types";
import { AuthShell } from "@/components/layout/AuthShell";
import { LoadingState } from "@/components/ui/States";
import { VerifyStep } from "./VerifyStep";
import { CategoriesStep } from "./CategoriesStep";

type Step = "verify" | "categories";

export function RecipientFlow({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("verify");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: ["share-preview", token],
    queryFn: () => sharingApi.getSharePreview(token),
    retry: false,
  });

  if (preview.isLoading) {
    return (
      <AuthShell title="Opening secure share…">
        <LoadingState />
      </AuthShell>
    );
  }

  if (preview.isError || !preview.data) {
    const message =
      preview.error instanceof ApiError
        ? preview.error.message
        : "This share link couldn't be found.";
    return (
      <AuthShell title="Link not available" description={message}>
        <p className="text-sm text-[var(--color-text-muted)]">
          Ask the person who shared it with you for a new link.
        </p>
      </AuthShell>
    );
  }

  if (preview.data.status !== "active") {
    const message =
      preview.data.status === "expired"
        ? "This share has expired."
        : "This share was revoked by the patient.";
    return <AuthShell title="This link is no longer active" description={message} />;
  }

  if (step === "categories" && accessToken) {
    return <CategoriesStep token={token} accessToken={accessToken} />;
  }

  return (
    <AuthShell
      title="Protected Health Record"
      description={`Healthy ID: ${preview.data.healthyId ?? "—"}`}
    >
      <VerifyStep
        token={token}
        onVerified={(newAccessToken) => {
          setAccessToken(newAccessToken);
          setStep("categories");
        }}
      />
    </AuthShell>
  );
}
