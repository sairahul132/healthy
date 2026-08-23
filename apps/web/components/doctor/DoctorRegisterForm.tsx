"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/types";
import { useRegisterDoctorProfile } from "@/lib/doctor/hooks";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function DoctorRegisterForm() {
  const [fullName, setFullName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [organization, setOrganization] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useRegisterDoctorProfile();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!fullName.trim() || !registrationNumber.trim() || !organization.trim()) {
      setError("Fill in your name, registration number, and organization.");
      return;
    }
    try {
      await mutation.mutateAsync({
        fullName: fullName.trim(),
        registrationNumber: registrationNumber.trim(),
        organization: organization.trim(),
        specialty: specialty.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't register. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        Register your professional details to request patient-shared access. A human reviews
        every registration before it&apos;s marked verified (§131) — this isn&apos;t automatic.
      </p>
      <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={mutation.isPending} />
      <Field
        label="Registration number"
        value={registrationNumber}
        onChange={(e) => setRegistrationNumber(e.target.value)}
        disabled={mutation.isPending}
      />
      <Field
        label="Organization / hospital"
        value={organization}
        onChange={(e) => setOrganization(e.target.value)}
        disabled={mutation.isPending}
      />
      <Field
        label="Specialty (optional)"
        value={specialty}
        onChange={(e) => setSpecialty(e.target.value)}
        disabled={mutation.isPending}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          Register as a doctor
        </Button>
      </div>
    </form>
  );
}
