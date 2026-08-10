"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as sharingApi from "@/lib/api/sharing";
import { ApiError } from "@/lib/api/types";
import { otpFormSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";

export function OtpStep({
  token,
  identifier,
  onVerified,
  onBack,
}: {
  token: string;
  identifier: string;
  onVerified: (accessToken: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const parsed = otpFormSchema.safeParse({ code });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Enter the 6-digit code.");
      }
      return sharingApi.verifyShareOtp(token, identifier, parsed.data.code);
    },
    onSuccess: (result) => onVerified(result.accessToken),
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't verify that code.",
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => sharingApi.requestShareOtp(token, identifier),
    onSuccess: () => setError(undefined),
  });

  return (
    <div className="flex flex-col gap-5">
      <OtpInput value={code} onChange={setCode} error={error} disabled={verifyMutation.isPending} />
      <Button
        type="button"
        isLoading={verifyMutation.isPending}
        disabled={code.trim().length !== 6}
        onClick={() => verifyMutation.mutate()}
        className="w-full"
      >
        Verify and continue
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Use a different identifier
        </button>
        <button
          type="button"
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending}
          className="font-medium text-[var(--color-brand)] hover:underline disabled:opacity-50"
        >
          {resendMutation.isPending
            ? "Sending…"
            : resendMutation.isSuccess
              ? "Code resent"
              : "Resend code"}
        </button>
      </div>
    </div>
  );
}
