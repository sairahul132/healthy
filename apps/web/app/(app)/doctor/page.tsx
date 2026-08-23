"use client";

import { DoctorDashboard } from "@/components/doctor/DoctorDashboard";

export default function DoctorPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Doctor</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Patients who&apos;ve shared their health data with you (docs/SPEC.md §40/§41).
      </p>
      <div className="mt-7">
        <DoctorDashboard />
      </div>
    </div>
  );
}
