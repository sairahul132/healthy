import { z } from "zod";

// E.164-ish phone or a plain email — the backend is the source of truth for
// stricter validation; this just catches obviously malformed input early.
const phonePattern = /^\+?[1-9]\d{7,14}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Enter your mobile number or email.")
  .refine(
    (value) => phonePattern.test(value) || emailPattern.test(value),
    "Enter a valid mobile number (with country code) or email address.",
  );

export const identifierFormSchema = z.object({
  identifier: identifierSchema,
});

export type IdentifierFormValues = z.infer<typeof identifierFormSchema>;

export const otpFormSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Enter the 6-digit code.")
    .regex(/^\d{6}$/, "The code must be 6 digits."),
});

export type OtpFormValues = z.infer<typeof otpFormSchema>;
