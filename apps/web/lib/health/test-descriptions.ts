import type { HealthCategoryId } from "@/lib/api/types";

/**
 * Short "what this measures" explainers for the Health page's detail pane
 * (design/health-page-mockup-v3-soft.html's about-note), keyed by canonical
 * test code — see apps/api/app/core/canonical_tests.py for the registry
 * this mirrors. Falls back to a generic per-category note for any test not
 * listed here, so a new canonical test never leaves the note empty.
 */
export const TEST_DESCRIPTIONS: Record<string, string> = {
  HGB: "Hemoglobin is the protein in red blood cells that carries oxygen. Low levels can mean anemia; high levels can mean dehydration or a blood disorder.",
  RBC: "Red blood cell count measures how many oxygen-carrying cells are in your blood — too few points toward anemia, too many toward dehydration or other conditions.",
  WBC: "White blood cells are your immune system's defenders. A high count often signals infection or inflammation; a low count can mean a weakened immune response.",
  PLT: "Platelets help your blood clot. Low counts raise bleeding risk; high counts can raise clotting risk.",
  HCT: "Hematocrit is the share of your blood made up of red blood cells — it moves together with hemoglobin and tells a similar story about oxygen-carrying capacity.",
  MCV: "Mean corpuscular volume is the average size of your red blood cells — used alongside other blood counts to narrow down the type of anemia, if present.",
  MCH: "Mean corpuscular hemoglobin is the average amount of hemoglobin in each red blood cell.",
  MCHC: "Mean corpuscular hemoglobin concentration is how densely packed hemoglobin is inside your red blood cells.",
  RDW: "Red cell distribution width measures how much your red blood cells vary in size — a wide spread can be an early sign of anemia before other counts change.",
  ESR: "Erythrocyte sedimentation rate is a general marker of inflammation somewhere in the body — it doesn't say where, just that something may be inflamed.",
  NEUT: "Neutrophils are the white blood cells that respond first to bacterial infection — usually the biggest share of your white cell count.",
  LYMPH: "Lymphocytes are white blood cells central to fighting viral infections and long-term immunity.",
  EOS: "Eosinophils are white blood cells that rise with allergic reactions and parasitic infections.",
  MONO: "Monocytes are white blood cells that clean up damaged tissue and help coordinate the rest of the immune response.",
  BASO: "Basophils are the least common white blood cell, involved in allergic and inflammatory reactions.",
  TCHOL: "Total cholesterol is the combined measure of LDL, HDL, and other lipids in your blood — a starting point for assessing heart disease risk.",
  LDL: "LDL ('bad') cholesterol can build up in artery walls over time — lower is generally better for heart health.",
  HDL: "HDL ('good') cholesterol helps clear other cholesterol from your bloodstream — higher is generally better.",
  VLDL: "VLDL cholesterol carries triglycerides through the blood and is a smaller contributor to overall cholesterol.",
  TRIG: "Triglycerides are a type of fat in your blood, mostly from food — high levels are linked to heart disease risk.",
  CREAT: "Creatinine is a waste product your kidneys filter out of your blood. A steady, in-range level over time is one of the clearest signs your kidneys are working well.",
  EGFR: "Estimated glomerular filtration rate estimates how well your kidneys are filtering blood — the single most-used marker of overall kidney function.",
  UREA: "Blood urea is another waste product filtered by the kidneys — rises when kidney function drops or with high protein intake/dehydration.",
  URICACID: "Uric acid is a waste product from breaking down purines in food — high levels are linked to gout and kidney stones.",
  NA: "Sodium is an electrolyte that balances fluid levels and nerve/muscle function — usually tightly regulated by the kidneys.",
  K: "Potassium is an electrolyte critical for heart rhythm and muscle function — both high and low levels can affect the heart.",
  CL: "Chloride is an electrolyte that works alongside sodium to maintain fluid balance and blood pH.",
  ALT: "ALT is a liver enzyme — elevated levels are one of the earliest signs of liver cell damage or strain.",
  AST: "AST is another liver enzyme, also found in muscle and heart tissue — usually interpreted alongside ALT.",
  GGT: "GGT is a liver enzyme sensitive to bile duct issues and alcohol use, often checked alongside ALT/AST.",
  ALP: "Alkaline phosphatase comes from the liver and bones — elevated levels can point to either, depending on the rest of your panel.",
  BILI_T: "Total bilirubin measures a byproduct of red blood cell breakdown that your liver clears — elevated levels can cause jaundice.",
  BILI_D: "Direct (conjugated) bilirubin is the portion your liver has already processed — elevated levels usually point to a liver or bile duct issue.",
  BILI_I: "Indirect (unconjugated) bilirubin is the portion not yet processed by your liver.",
  TPROT: "Total protein measures albumin and globulin together — a broad marker of liver and kidney health, and nutrition.",
  ALB: "Albumin is the main protein made by your liver — low levels can point to liver disease, kidney loss of protein, or poor nutrition.",
  GLOB: "Globulins are a family of proteins involved in immune function and blood clotting.",
  TSH: "Thyroid-stimulating hormone tells your thyroid how much hormone to produce — usually the first test used to check thyroid function.",
  FT4: "Free T4 is the main hormone your thyroid produces — checked alongside TSH to understand thyroid function in more detail.",
  TT3: "Total T3 is an active thyroid hormone, typically checked when TSH or T4 results need more context.",
  TT4: "Total thyroxine (T4) is the main hormone released by the thyroid gland.",
  FBG: "Fasting glucose measures blood sugar after not eating for several hours — a core screening test for diabetes.",
  HBA1C: "HbA1c reflects your average blood sugar over the past ~3 months — used to diagnose and monitor diabetes.",
  AMPG: "Approximate mean plasma glucose translates your HbA1c into an average blood sugar number, in the same units as a glucose reading.",
  VITD: "Vitamin D supports bone health and immune function — commonly low, especially with limited sun exposure.",
  B12: "Vitamin B12 is essential for nerve function and red blood cell production — low levels can cause fatigue and anemia.",
  CA: "Calcium supports bone health, muscle function, and nerve signaling — closely regulated by the body.",
  FE: "Iron is essential for making hemoglobin — low levels are a common cause of anemia.",
  TIBC: "Total iron-binding capacity measures your blood's capacity to carry iron — interpreted together with iron and ferritin.",
  TRANSFERRIN: "Transferrin is the protein that transports iron through your bloodstream.",
  TRANSFERRIN_SAT: "Transferrin saturation shows what share of your iron-carrying capacity is actually being used — a sensitive marker for iron deficiency or overload.",
  FERRITIN: "Ferritin reflects your body's stored iron — usually the most reliable single marker for iron deficiency.",
  RENIN: "Renin activity is a hormone marker used mainly to investigate high blood pressure and adrenal or kidney causes of it.",
  ALDO: "Aldosterone is a hormone that helps regulate blood pressure and sodium/potassium balance.",
  USG: "Urine specific gravity shows how concentrated your urine is — a quick marker of hydration and kidney concentrating ability.",
  UPH: "Urine pH measures how acidic or alkaline your urine is — influenced by diet and relevant to kidney stone risk.",
  IGE: "Total IgE is an antibody linked to allergic reactions — often elevated with allergies, asthma, or certain infections.",
  PSA: "Prostate-specific antigen is used to screen for and monitor prostate conditions, including cancer.",
};

const CATEGORY_FALLBACKS: Record<HealthCategoryId, string> = {
  blood: "Part of your blood panel — used together with related tests to build a fuller picture, not read alone.",
  heart: "Part of your cardiovascular panel — used to assess heart and blood vessel health.",
  liver: "Part of your liver panel — used to check how well your liver is functioning.",
  kidney: "Part of your kidney panel — used to check how well your kidneys are filtering waste from your blood.",
  thyroid: "Part of your thyroid panel — used to check how your thyroid is regulating metabolism.",
  diabetes: "Part of your metabolic panel — used to screen for and monitor blood sugar regulation.",
  vitamins: "A nutrient level — low or high results can affect energy, bone health, and other body systems.",
  urine: "Part of your urinalysis — a quick check of kidney function and hydration.",
  hormones: "A hormone marker — used alongside related tests to understand a specific body system.",
  infection: "Part of your infection/immunity panel — helps assess how your immune system is responding.",
  allergy: "An allergy-related marker — used to help identify or confirm allergic conditions.",
  autoimmune: "An autoimmune marker — used to help identify or monitor autoimmune conditions.",
  imaging: "An imaging finding — interpreted by a radiologist alongside your clinical history.",
  tumor_markers: "A tumor marker — used for screening or monitoring, always interpreted alongside other findings.",
  other: "A lab result from your uploaded reports.",
};

export function getTestDescription(canonicalCode: string, category: HealthCategoryId): string {
  return TEST_DESCRIPTIONS[canonicalCode] ?? CATEGORY_FALLBACKS[category];
}
