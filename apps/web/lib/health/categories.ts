import type { HealthCategory, HealthCategoryId } from "@/lib/api/types";

/**
 * Category definitions (docs/SPEC.md §21/§83). In production these come
 * from the backend/database, not the frontend — hard-coding them into the
 * client would make adding a new category a redeploy. This local copy
 * exists only because apps/api doesn't expose GET /health/categories yet;
 * replace with a fetched list once it does.
 */
export const HEALTH_CATEGORIES: Record<HealthCategoryId, HealthCategory> = {
  blood: { id: "blood", label: "Blood", icon: "🩸" },
  heart: { id: "heart", label: "Heart & Cardiovascular", icon: "❤️" },
  liver: { id: "liver", label: "Liver", icon: "🫁" },
  kidney: { id: "kidney", label: "Kidney", icon: "🫘" },
  thyroid: { id: "thyroid", label: "Thyroid", icon: "🦋" },
  diabetes: { id: "diabetes", label: "Diabetes & Metabolic", icon: "🩹" },
  vitamins: { id: "vitamins", label: "Vitamins & Minerals", icon: "🧪" },
  urine: { id: "urine", label: "Urine", icon: "💧" },
  hormones: { id: "hormones", label: "Hormones", icon: "⚛️" },
  infection: { id: "infection", label: "Infection & Immunity", icon: "🛡️" },
  allergy: { id: "allergy", label: "Allergy", icon: "🌿" },
  autoimmune: { id: "autoimmune", label: "Autoimmune", icon: "🧬" },
  imaging: { id: "imaging", label: "Imaging", icon: "🖼️" },
  tumor_markers: { id: "tumor_markers", label: "Cancer/Tumor Markers", icon: "🔬" },
  other: { id: "other", label: "Other", icon: "📄" },
};

export function getCategory(id: HealthCategoryId): HealthCategory {
  return HEALTH_CATEGORIES[id];
}
