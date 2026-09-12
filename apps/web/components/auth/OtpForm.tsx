"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAuthProvider } from "@/lib/auth/get-provider";
import { useSession } from "@/lib/auth/session-context";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { otpFormSchema } from "@/lib/validation/auth";
import { maskIdentifier } from "@/lib/utils/identifier";

const RESEND_COOLDOWN_SECONDS = 30;

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function OtpForm({
  identifier,
  mode,
  initialExpiresInSeconds,
  initialResendCooldownSeconds,
}: {
  identifier: string;
  mode: "register" | "login";
  initialExpiresInSeconds: number;
  initialResendCooldownSeconds: number;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(initialExpiresInSeconds);
  const [resendCooldown, setResendCooldown] = useState(initialResendCooldownSeconds);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
      setResendCooldown((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expired = secondsLeft <= 0;

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const parsed = otpFormSchema.safeParse({ code });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Enter the 6-digit code.");
      }
      return getAuthProvider().verifyOtp(identifier, parsed.data.code);
    },
    onSuccess: async () => {
      setFormError(undefined);
      await refresh();
      router.push("/dashboard");
    },
    onError: (error) => {
      autoSubmitted.current = false;
      setFormError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Couldn't verify that code. Please try again.",
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: () =>
      mode === "register"
        ? getAuthProvider().register(identifier)
        : getAuthProvider().login(identifier),
    onSuccess: (challenge) => {
      setFormError(undefined);
      setSuccessMessage(`A new code was sent to ${maskIdentifier(identifier)}.`);
      setCode("");
      autoSubmitted.current = false;
      setSecondsLeft(challenge.expiresInSeconds);
      setResendCooldown(challenge.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
    },
    onError: (error) => {
      setSuccessMessage(undefined);
      setFormError(
        error instanceof ApiError ? error.message : "Couldn't resend the code. Please try again.",
      );
    },
  });

  const canVerify = code.trim().length === 6 && !expired;

  useEffect(() => {
    if (canVerify && !autoSubmitted.current && !verifyMutation.isPending) {
      autoSubmitted.current = true;
      verifyMutation.mutate();
    }
    if (code.trim().length !== 6) {
      autoSubmitted.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-[var(--color-text)]">{maskIdentifier(identifier)}</span>
        </p>
        <OtpInput
          value={code}
          onChange={(value) => {
            setSuccessMessage(undefined);
            setCode(value);
          }}
          onEnter={() => canVerify && !verifyMutation.isPending && verifyMutation.mutate()}
          error={formError}
          disabled={verifyMutation.isPending || expired}
        />
        <p
          className={`mt-2 text-xs ${expired ? "font-medium text-[var(--color-danger)]" : "text-[var(--color-text-faint)]"}`}
        >
          {expired
            ? "This code has expired. Request a new one below."
            : `Code expires in ${formatCountdown(secondsLeft)}`}
        </p>
        {successMessage ? (
          <p role="status" className="mt-2 text-xs font-medium text-[var(--color-brand)]">
            {successMessage}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        isLoading={verifyMutation.isPending}
        disabled={!canVerify}
        onClick={() => verifyMutation.mutate()}
        className="w-full"
      >
        Verify and continue
      </Button>
      <button
        type="button"
        onClick={() => resendMutation.mutate()}
        disabled={resendMutation.isPending || resendCooldown > 0}
        className="text-sm font-medium text-[var(--color-brand)] hover:underline disabled:opacity-50"
      >
        {resendMutation.isPending
          ? "Sending a new code…"
          : resendCooldown > 0
            ? `Resend code in ${formatCountdown(resendCooldown)}`
            : "Resend code"}
      </button>
    </div>
  );
}
