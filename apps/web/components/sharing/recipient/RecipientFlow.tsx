"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as sharingApi from "@/lib/api/sharing";
import { ApiError } from "@/lib/api/types";
import { AuthShell } from "@/components/layout/AuthShell";
import { LoadingState } from "@/components/ui/States";
import { IdentifyStep } from "./IdentifyStep";
import { OtpStep } from "./OtpStep";
import { CategoriesStep } from "./CategoriesStep";

type Step = "identify" | "otp" | "categories";

export function RecipientFlow({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
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

  if (step === "otp") {
    return (
      <AuthShell
        title="Enter your code"
        description={`We sent a 6-digit code to ${identifier}.`}
      >
        <OtpStep
          token={token}
          identifier={identifier}
          onVerified={(newAccessToken) => {
            setAccessToken(newAccessToken);
            setStep("categories");
          }}
          onBack={() => setStep("identify")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Protected Health Record"
      description={`Healthy ID: ${preview.data.healthyId ?? "—"}`}
    >
      <IdentifyStep
        token={token}
        onRequested={(enteredIdentifier) => {
          setIdentifier(enteredIdentifier);
          setStep("otp");
        }}
      />
    </AuthShell>
  );
}
