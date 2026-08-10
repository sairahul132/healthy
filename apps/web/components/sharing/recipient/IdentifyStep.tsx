"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as sharingApi from "@/lib/api/sharing";
import { ApiError } from "@/lib/api/types";
import { identifierSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function IdentifyStep({
  token,
  onRequested,
}: {
  token: string;
  onRequested: (identifier: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (value: string) => sharingApi.requestShareOtp(token, value),
    onSuccess: (_, value) => onRequested(value),
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't send a code right now. Please try again.",
      );
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = identifierSchema.safeParse(identifier);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid mobile number or email.");
      return;
    }
    setError(null);
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        label="Your mobile number or email"
        hint="Must match what the patient shared with"
        placeholder="+91 98765 43210 or you@example.com"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        error={error ?? undefined}
        disabled={mutation.isPending}
      />
      <Button type="submit" isLoading={mutation.isPending} className="w-full">
        Continue
      </Button>
    </form>
  );
}
