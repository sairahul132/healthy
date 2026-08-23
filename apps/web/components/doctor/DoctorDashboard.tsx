"use client";

import Link from "next/link";
import { useDoctorPatients, useDoctorProfile } from "@/lib/doctor/hooks";
import { getCategory } from "@/lib/health/categories";
import { formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { DoctorRegisterForm } from "./DoctorRegisterForm";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
};

export function DoctorDashboard() {
  const { data: profile, isLoading } = useDoctorProfile();

  if (isLoading) return <LoadingState label="Loading…" />;

  if (!profile) {
    return (
      <Card className="max-w-lg p-6">
        <DoctorRegisterForm />
      </Card>
    );
  }

  if (profile.verificationStatus === "pending") {
    return (
      <Card className="max-w-lg p-6">
        <p className="text-sm font-medium text-[var(--color-text)]">
          {profile.fullName} · {profile.organization}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Your registration is awaiting verification. Once verified, patients who share their
          Healthy data with your registered identifier will appear here automatically.
        </p>
      </Card>
    );
  }

  if (profile.verificationStatus === "rejected") {
    return (
      <Card className="max-w-lg p-6">
        <p className="text-sm font-medium text-[var(--color-danger)]">
          This doctor registration wasn&apos;t approved.
        </p>
      </Card>
    );
  }

  return <VerifiedDoctorPatients />;
}

function VerifiedDoctorPatients() {
  const { data: patients, isLoading, isError, refetch } = useDoctorPatients(true);

  if (isLoading) return <LoadingState label="Loading your patients…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your patients."
        action={
          <button onClick={() => refetch()} className="text-sm font-medium text-[var(--color-brand)]">
            Retry
          </button>
        }
      />
    );
  }
  if (!patients || patients.length === 0) {
    return (
      <EmptyState
        title="No patients yet"
        description="When a patient shares their health data with your registered phone/email, it'll show up here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {patients.map((patient) => (
        <Link key={patient.sessionId} href={`/doctor/patients/${patient.sessionId}`}>
          <Card className="p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-brand)]/30 hover:shadow-md">
            <p className="font-display text-[15px] font-medium text-[var(--color-text)]">
              {patient.healthyId}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {STATUS_LABEL[patient.status] ?? patient.status} · expires{" "}
              {formatDate(patient.expiresAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {patient.categoryIds.map((id) => {
                const category = getCategory(id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
                  >
                    <span aria-hidden="true">{category.icon}</span>
                    {category.label}
                  </span>
                );
              })}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
