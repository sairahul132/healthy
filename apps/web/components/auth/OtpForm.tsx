"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAuthProvider } from "@/lib/auth/get-provider";
import { useSession } from "@/lib/auth/session-context";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { otpFormSchema } from "@/lib/validation/auth";

export function OtpForm({
  identifier,
  mode,
}: {
  identifier: string;
  mode: "register" | "login";
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | undefined>();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const parsed = otpFormSchema.safeParse({ code });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Enter the 6-digit code.");
      }
      return getAuthProvider().verifyOtp(identifier, parsed.data.code);
    },
    onSuccess: async () => {
      await refresh();
      router.push("/dashboard");
    },
    onError: (error) => {
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
    onSuccess: () => setFormError(undefined),
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          Enter the 6-digit code sent to <span className="font-medium text-[var(--color-text)]">{identifier}</span>
        </p>
        <p className="mb-3 text-xs text-[var(--color-text-faint)]">
          Demo mode — any 6 digits will work, e.g. 123456.
        </p>
        <OtpInput value={code} onChange={setCode} error={formError} disabled={verifyMutation.isPending} />
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
      <button
        type="button"
        onClick={() => resendMutation.mutate()}
        disabled={resendMutation.isPending}
        className="text-sm font-medium text-[var(--color-brand)] hover:underline disabled:opacity-50"
      >
        {resendMutation.isPending
          ? "Sending a new code…"
          : resendMutation.isSuccess
            ? "Code resent"
            : "Resend code"}
      </button>
    </div>
  );
}
