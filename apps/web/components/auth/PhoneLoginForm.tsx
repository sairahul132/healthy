"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getAuthProvider } from "@/lib/auth/get-provider";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { encodeIdentifierForUrl } from "@/lib/utils/identifier";

/** Same OTP request flow as IdentifierForm, with a phone-specific,
 * +91-prefixed input in place of the combined phone-or-email field — the
 * premium hero-scene login/register pages are phone-first. Email sign-in
 * has no entry point on these two pages as a result; IdentifierForm (and
 * its email support) still exists and is unaffected, for wherever a
 * combined field is wanted again. */
export function PhoneLoginForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: (identifier: string) =>
      mode === "register" ? getAuthProvider().register(identifier) : getAuthProvider().login(identifier),
    onSuccess: (challenge, identifier) => {
      const params = new URLSearchParams({
        mode,
        identifier: encodeIdentifierForUrl(identifier),
        expiresIn: String(challenge.expiresInSeconds),
        retryAfter: String(challenge.retryAfterSeconds),
      });
      router.push(`/verify?${params.toString()}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Healthy can't be reached right now. Please try again shortly.");
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (digits.length !== 10) {
      setError("Enter a 10-digit mobile number.");
      return;
    }
    setError(undefined);
    mutation.mutate(`+91${digits}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:gap-5">
      <PhoneInput
        label="Mobile number"
        placeholder="Enter your mobile number"
        value={digits}
        onValueChange={(next) => {
          setDigits(next);
          setError(undefined);
        }}
        error={error}
      />

      <Button type="submit" isLoading={mutation.isPending} className="h-11 w-full px-4 text-sm sm:h-14 sm:px-5 sm:text-[15px]">
        {/* Button's own layout centers its children as a group (justify-center,
           fixed at the component level) — this inner row does the actual
           text/icon spacing so it isn't fighting that for justify-content. */}
        <span className="flex flex-1 items-center justify-between">
          Send one-time code
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </Button>

      <SocialLoginButtons />

      <p className="text-center text-[11px] leading-snug text-[var(--color-text-muted)] sm:text-xs sm:leading-relaxed">
        By continuing, you agree to our{" "}
        <span className="font-semibold text-[var(--color-text)]">Terms of Service</span> and{" "}
        <span className="font-semibold text-[var(--color-text)]">Privacy Policy</span>.
      </p>
    </form>
  );
}
