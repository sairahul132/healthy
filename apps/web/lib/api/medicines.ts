import { apiFetch } from "./client";
import type { Medicine } from "./types";

export interface CreateMedicineInput {
  name: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  prescribingDoctor?: string;
  reason?: string;
}

export function createMedicine(input: CreateMedicineInput): Promise<Medicine> {
  return apiFetch<Medicine>("/medicines", { method: "POST", body: input });
}

export function listMedicines(): Promise<Medicine[]> {
  return apiFetch<Medicine[]>("/medicines");
}

export interface UpdateMedicineInput {
  active?: boolean;
  name?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  endDate?: string;
  reason?: string;
}

export function updateMedicine(id: string, input: UpdateMedicineInput): Promise<Medicine> {
  return apiFetch<Medicine>(`/medicines/${id}`, { method: "PATCH", body: input });
}

export function deleteMedicine(id: string): Promise<void> {
  return apiFetch<void>(`/medicines/${id}`, { method: "DELETE" });
}
