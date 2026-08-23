"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as sharingApi from "@/lib/api/sharing";
import { ApiError } from "@/lib/api/types";
import { identifierSchema, otpFormSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { OtpInput } from "@/components/ui/OtpInput";

/** Identifier entry and OTP entry on one screen — the number/email field
 * stays visible (disabled once a code has been requested) instead of
 * navigating away to a separate "enter your code" screen. */
export function VerifyStep({
  token,
  onVerified,
}: {
  token: string;
  onVerified: (accessToken: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string | undefined>();

  const requestMutation = useMutation({
    mutationFn: (value: string) => sharingApi.requestShareOtp(token, value),
    onSuccess: () => setOtpRequested(true),
    onError: (err) => {
      setIdentifierError(
        err instanceof ApiError ? err.message : "Couldn't send a code right now. Please try again.",
      );
    },
  });

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
      setOtpError(
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
    onSuccess: () => setOtpError(undefined),
  });

  function handleIdentifySubmit(event: React.FormEvent) {
    event.preventDefault();
    setIdentifierError(null);
    const parsed = identifierSchema.safeParse(identifier);
    if (!parsed.success) {
      setIdentifierError(parsed.error.issues[0]?.message ?? "Enter a valid mobile number or email.");
      return;
    }
    setIdentifier(parsed.data);
    requestMutation.mutate(parsed.data);
  }

  function useDifferentIdentifier() {
    setOtpRequested(false);
    setCode("");
    setOtpError(undefined);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleIdentifySubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Your mobile number or email"
          hint={otpRequested ? undefined : "Must match what the patient shared with"}
          placeholder="+91 98765 43210 or you@example.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={identifierError ?? undefined}
          disabled={otpRequested || requestMutation.isPending}
        />
        {!otpRequested ? (
          <Button type="submit" isLoading={requestMutation.isPending} className="w-full">
            Continue
          </Button>
        ) : null}
      </form>

      {otpRequested ? (
        <div className="flex flex-col gap-5 border-t border-[var(--color-border)] pt-5">
          <div>
            <p className="mb-2 text-sm text-[var(--color-text-muted)]">Enter the 6-digit code we sent you.</p>
            <OtpInput value={code} onChange={setCode} error={otpError} disabled={verifyMutation.isPending} />
          </div>
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
              onClick={useDifferentIdentifier}
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
      ) : null}
    </div>
  );
}
