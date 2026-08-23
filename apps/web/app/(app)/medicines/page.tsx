"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AddMedicineForm } from "@/components/medicines/AddMedicineForm";
import { MedicineList } from "@/components/medicines/MedicineList";
import { PrescriptionUpload } from "@/components/prescriptions/PrescriptionUpload";
import { PrescriptionList } from "@/components/prescriptions/PrescriptionList";

export default function MedicinesPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Medicines</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Your current medicines, and prescriptions you&apos;ve uploaded (docs/SPEC.md §38/§39).
      </p>

      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Add a medicine</CardTitle>
        </CardHeader>
        <CardContent>
          <AddMedicineForm />
        </CardContent>
      </Card>

      <div className="mt-6">
        <MedicineList />
      </div>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-[var(--color-text)]">Prescriptions</h2>
        <PrescriptionUpload />
      </div>
      <PrescriptionList />
    </div>
  );
}
