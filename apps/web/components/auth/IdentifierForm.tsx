"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { getAuthProvider } from "@/lib/auth/get-provider";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { identifierFormSchema, type IdentifierFormValues } from "@/lib/validation/auth";
import { encodeIdentifierForUrl } from "@/lib/utils/identifier";

export function IdentifierForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<IdentifierFormValues>({
    resolver: zodResolver(identifierFormSchema),
    defaultValues: { identifier: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: IdentifierFormValues) =>
      mode === "register"
        ? getAuthProvider().register(values.identifier)
        : getAuthProvider().login(values.identifier),
    onSuccess: (challenge, values) => {
      const params = new URLSearchParams({
        mode,
        identifier: encodeIdentifierForUrl(values.identifier),
        expiresIn: String(challenge.expiresInSeconds),
        retryAfter: String(challenge.retryAfterSeconds),
      });
      router.push(`/verify?${params.toString()}`);
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : "Healthy can't be reached right now. Please try again shortly.";
      setError("identifier", { type: "server", message });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field
        label="Mobile number or email"
        placeholder="+91 98765 43210 or you@example.com"
        autoComplete="username"
        error={errors.identifier?.message}
        icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8.2" r="3.4" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M5 19.2c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        }
        {...registerField("identifier")}
      />
      <Button type="submit" isLoading={mutation.isPending} className="w-full">
        Send one-time code
      </Button>
    </form>
  );
}
