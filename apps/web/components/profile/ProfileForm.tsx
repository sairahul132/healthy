"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { getAuthProvider } from "@/lib/auth/get-provider";
import { useSession } from "@/lib/auth/session-context";
import { ApiError } from "@/lib/api/types";
import type { User } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { profileFormSchema, type ProfileFormValues } from "@/lib/validation/profile";

function toFormValues(user: User): ProfileFormValues {
  return {
    name: user.name ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    sex: user.sex && user.sex !== "unspecified" ? user.sex : undefined,
    bloodGroup: user.bloodGroup ?? "",
    emergencyContactName: user.emergencyContact?.name ?? "",
    emergencyContactRelationship: user.emergencyContact?.relationship ?? "",
    emergencyContactPhone: user.emergencyContact?.phone ?? "",
    allergies: user.allergies.join(", "),
    currentMedications: user.currentMedications.join(", "),
  };
}

function splitList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProfileForm({ user }: { user: User }) {
  const { refresh } = useSession();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(user),
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      getAuthProvider().updateProfile({
        name: values.name || null,
        dateOfBirth: values.dateOfBirth || null,
        sex: values.sex,
        bloodGroup: values.bloodGroup || null,
        emergencyContact:
          values.emergencyContactName || values.emergencyContactPhone
            ? {
                name: values.emergencyContactName ?? "",
                relationship: values.emergencyContactRelationship ?? "",
                phone: values.emergencyContactPhone ?? "",
              }
            : null,
        allergies: splitList(values.allergies),
        currentMedications: splitList(values.currentMedications),
      }),
    onSuccess: async () => {
      setSuccessMessage("Profile updated.");
      await refresh();
    },
    onError: (error) => {
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "Couldn't save your profile right now. Please try again.",
      });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setSuccessMessage(null);
        mutation.mutate(values);
      })}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name?.message} {...register("name")} />
        <Field
          label="Date of birth"
          type="date"
          error={errors.dateOfBirth?.message}
          {...register("dateOfBirth")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sex" className="text-sm font-medium text-[var(--color-text)]">
            Sex
          </label>
          <select
            id="sex"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
            {...register("sex")}
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Field label="Blood group" placeholder="O+" error={errors.bloodGroup?.message} {...register("bloodGroup")} />
      </div>

      <fieldset className="rounded-lg border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-medium text-[var(--color-text)]">Emergency contact</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Name"
            error={errors.emergencyContactName?.message}
            {...register("emergencyContactName")}
          />
          <Field
            label="Relationship"
            placeholder="Spouse, parent…"
            error={errors.emergencyContactRelationship?.message}
            {...register("emergencyContactRelationship")}
          />
          <Field
            label="Phone"
            error={errors.emergencyContactPhone?.message}
            {...register("emergencyContactPhone")}
          />
        </div>
      </fieldset>

      <Field
        label="Allergies"
        hint="Separate multiple with commas"
        error={errors.allergies?.message}
        {...register("allergies")}
      />
      <Field
        label="Current medications"
        hint="Separate multiple with commas"
        error={errors.currentMedications?.message}
        {...register("currentMedications")}
      />

      {errors.root?.message ? (
        <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {errors.root.message}
        </p>
      ) : null}
      {successMessage ? (
        <p role="status" className="text-sm font-medium text-[var(--status-green)]">
          {successMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" isLoading={mutation.isPending} disabled={!isDirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
