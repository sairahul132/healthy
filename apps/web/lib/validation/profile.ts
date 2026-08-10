import { z } from "zod";

// Per docs/SPEC.md §13: sensitive fields are optional, never mandatory.
export const profileFormSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  sex: z.enum(["male", "female", "other", "unspecified"]).optional(),
  bloodGroup: z.string().trim().max(10).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactRelationship: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(20).optional().or(z.literal("")),
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
  currentMedications: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
