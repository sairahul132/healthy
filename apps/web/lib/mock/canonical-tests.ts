import type { HealthCategoryId } from "@/lib/api/types";

/**
 * MOCK canonical test catalog for local development only.
 *
 * Mirrors docs/SPEC.md §94 (lab format normalization): different labs call
 * the same test different things ("Hb", "HGB", "Hemoglobin"), so the real
 * system normalizes to one of these canonical definitions. Values here are
 * used only to generate synthetic reports (§113) — never real patient data.
 */
export interface CanonicalTest {
  code: string;
  name: string;
  category: HealthCategoryId;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  /** Typical synthetic value range, used to generate demo results. */
  typicalLow: number;
  typicalHigh: number;
  decimals: number;
}

export const CANONICAL_TESTS: CanonicalTest[] = [
  { code: "HGB", name: "Hemoglobin", category: "blood", unit: "g/dL", referenceLow: 13, referenceHigh: 17, typicalLow: 11.5, typicalHigh: 16.5, decimals: 1 },
  { code: "WBC", name: "White Blood Cell Count", category: "blood", unit: "10^3/µL", referenceLow: 4, referenceHigh: 11, typicalLow: 3.8, typicalHigh: 11.5, decimals: 1 },
  { code: "PLT", name: "Platelet Count", category: "blood", unit: "10^3/µL", referenceLow: 150, referenceHigh: 450, typicalLow: 140, typicalHigh: 420, decimals: 0 },
  { code: "HCT", name: "Hematocrit", category: "blood", unit: "%", referenceLow: 38, referenceHigh: 50, typicalLow: 35, typicalHigh: 49, decimals: 1 },

  { code: "TCHOL", name: "Total Cholesterol", category: "heart", unit: "mg/dL", referenceLow: null, referenceHigh: 200, typicalLow: 150, typicalHigh: 240, decimals: 0 },
  { code: "LDL", name: "LDL Cholesterol", category: "heart", unit: "mg/dL", referenceLow: null, referenceHigh: 100, typicalLow: 70, typicalHigh: 160, decimals: 0 },
  { code: "HDL", name: "HDL Cholesterol", category: "heart", unit: "mg/dL", referenceLow: 40, referenceHigh: null, typicalLow: 30, typicalHigh: 70, decimals: 0 },
  { code: "TRIG", name: "Triglycerides", category: "heart", unit: "mg/dL", referenceLow: null, referenceHigh: 150, typicalLow: 60, typicalHigh: 200, decimals: 0 },

  { code: "CREAT", name: "Creatinine", category: "kidney", unit: "mg/dL", referenceLow: 0.6, referenceHigh: 1.3, typicalLow: 0.6, typicalHigh: 1.6, decimals: 2 },
  { code: "EGFR", name: "eGFR", category: "kidney", unit: "mL/min/1.73m²", referenceLow: 90, referenceHigh: null, typicalLow: 65, typicalHigh: 110, decimals: 0 },
  { code: "UREA", name: "Blood Urea", category: "kidney", unit: "mg/dL", referenceLow: 7, referenceHigh: 20, typicalLow: 6, typicalHigh: 26, decimals: 0 },

  { code: "ALT", name: "ALT (SGPT)", category: "liver", unit: "U/L", referenceLow: 7, referenceHigh: 56, typicalLow: 8, typicalHigh: 70, decimals: 0 },
  { code: "AST", name: "AST (SGOT)", category: "liver", unit: "U/L", referenceLow: 10, referenceHigh: 40, typicalLow: 10, typicalHigh: 55, decimals: 0 },
  { code: "BILI", name: "Total Bilirubin", category: "liver", unit: "mg/dL", referenceLow: 0.1, referenceHigh: 1.2, typicalLow: 0.2, typicalHigh: 1.6, decimals: 1 },

  { code: "TSH", name: "TSH", category: "thyroid", unit: "mIU/L", referenceLow: 0.4, referenceHigh: 4, typicalLow: 0.3, typicalHigh: 6, decimals: 2 },
  { code: "FT4", name: "Free T4", category: "thyroid", unit: "ng/dL", referenceLow: 0.8, referenceHigh: 1.8, typicalLow: 0.7, typicalHigh: 2, decimals: 2 },

  { code: "FBG", name: "Fasting Glucose", category: "diabetes", unit: "mg/dL", referenceLow: 70, referenceHigh: 100, typicalLow: 68, typicalHigh: 130, decimals: 0 },
  { code: "HBA1C", name: "HbA1c", category: "diabetes", unit: "%", referenceLow: null, referenceHigh: 5.7, typicalLow: 4.8, typicalHigh: 7, decimals: 1 },

  { code: "VITD", name: "Vitamin D (25-OH)", category: "vitamins", unit: "ng/mL", referenceLow: 30, referenceHigh: 100, typicalLow: 12, typicalHigh: 60, decimals: 0 },
  { code: "B12", name: "Vitamin B12", category: "vitamins", unit: "pg/mL", referenceLow: 200, referenceHigh: 900, typicalLow: 150, typicalHigh: 700, decimals: 0 },
];

export const REPORT_TEMPLATES: Array<{ label: string; testCodes: string[] }> = [
  { label: "Complete Blood Count (CBC)", testCodes: ["HGB", "WBC", "PLT", "HCT"] },
  { label: "Lipid Profile", testCodes: ["TCHOL", "LDL", "HDL", "TRIG"] },
  { label: "Kidney Function Test", testCodes: ["CREAT", "EGFR", "UREA"] },
  { label: "Liver Function Test", testCodes: ["ALT", "AST", "BILI"] },
  { label: "Thyroid Profile", testCodes: ["TSH", "FT4"] },
  { label: "HbA1c & Fasting Glucose", testCodes: ["FBG", "HBA1C"] },
];
