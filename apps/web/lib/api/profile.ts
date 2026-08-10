import { apiFetch } from "./client";
import type { User } from "./types";

export interface UpdateProfileInput {
  name?: string | null;
  dateOfBirth?: string | null;
  sex?: User["sex"];
  bloodGroup?: string | null;
  emergencyContact?: { name: string; relationship: string; phone: string } | null;
  allergies?: string[];
  currentMedications?: string[];
}

export function updateProfile(input: UpdateProfileInput): Promise<User> {
  return apiFetch<User>("/users/me", { method: "PATCH", body: input });
}
