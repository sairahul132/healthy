"""Canonical lab test registry (docs/SPEC.md §94 lab format normalization).

Different labs call the same test different things ("Hb", "HGB",
"Hemoglobin", "S.G.O.T(AST)", "Aspartate Aminotransferase") — this maps
every known alias to one canonical test definition (category, unit,
reference range). The alias lists below were built and validated against
real lab report text (not just clean synthetic fixtures) — see
app/services/lab_extraction.py's module docstring for why that distinction
matters. Mirrors apps/web's lib/mock/canonical-tests.ts test set for the
tests both share, so a real extracted report and a synthetic mock report
land on identical canonical names/categories/units where they overlap.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CanonicalTest:
    code: str
    name: str
    category: str
    unit: str
    reference_low: float | None
    reference_high: float | None
    aliases: tuple[str, ...] = field(default_factory=tuple)


CANONICAL_TESTS: tuple[CanonicalTest, ...] = (
    # --- Blood / CBC (§22) ---
    CanonicalTest(
        "HGB", "Hemoglobin", "blood", "g/dL", 13, 17, ("hb", "hgb", "hemoglobin", "haemoglobin")
    ),
    CanonicalTest(
        "RBC",
        "RBC Count",
        "blood",
        "millions/cu mm",
        4.5,
        5.9,
        ("rbc count", "rbc", "red blood cell count", "r.b.c count"),
    ),
    CanonicalTest(
        "WBC",
        "White Blood Cell Count",
        "blood",
        "10^3/µL",
        4,
        11,
        ("wbc count", "wbc cout", "wbc", "white blood cell count", "white blood cells", "tlc"),
    ),
    CanonicalTest(
        "PLT",
        "Platelet Count",
        "blood",
        "10^3/µL",
        150,
        450,
        ("plt", "platelet count", "platelets"),
    ),
    CanonicalTest(
        "HCT",
        "Hematocrit",
        "blood",
        "%",
        38,
        50,
        ("hct", "hematocrit", "pcv(hematocrit)", "pcv (hematocrit)", "pcv"),
    ),
    CanonicalTest("MCV", "MCV", "blood", "fl", 76, 96, ("mcv",)),
    CanonicalTest("MCH", "MCH", "blood", "pg", 27, 32, ("mch",)),
    CanonicalTest("MCHC", "MCHC", "blood", "g/dl", 30, 35, ("mchc",)),
    CanonicalTest("RDW", "RDW", "blood", "%", 11.6, 14, ("rdw (cv)", "rdw(cv)", "rdw")),
    CanonicalTest("ESR", "ESR (First Hour)", "blood", "mm", 1, 10, ("first hr", "esr")),
    CanonicalTest(
        "NEUT",
        "Neutrophils",
        "blood",
        "%",
        40,
        70,
        ("neutrophils",),
    ),
    CanonicalTest("LYMPH", "Lymphocytes", "blood", "%", 20, 40, ("lymphocytes",)),
    CanonicalTest("EOS", "Eosinophils", "blood", "%", 1, 6, ("eosinophils",)),
    CanonicalTest("MONO", "Monocytes", "blood", "%", 3, 8, ("monocytes",)),
    CanonicalTest("BASO", "Basophils", "blood", "%", 0, 1, ("basophils",)),
    # --- Heart & Cardiovascular (§23) ---
    CanonicalTest(
        "TCHOL",
        "Total Cholesterol",
        "heart",
        "mg/dL",
        None,
        200,
        ("total cholesterol", "cholesterol total", "tchol", "cholesterol"),
    ),
    CanonicalTest(
        "LDL",
        "LDL Cholesterol",
        "heart",
        "mg/dL",
        None,
        100,
        ("l.d.l cholesterol", "ldl cholesterol", "ldl-c", "ldl"),
    ),
    CanonicalTest(
        "HDL",
        "HDL Cholesterol",
        "heart",
        "mg/dL",
        40,
        None,
        ("h.d.l cholesterol", "hdl cholesterol", "hdl-c", "hdl"),
    ),
    CanonicalTest(
        "VLDL",
        "VLDL Cholesterol",
        "heart",
        "mg/dL",
        None,
        40,
        ("v.l.d.l cholesterol", "vldl cholesterol", "vldl"),
    ),
    CanonicalTest("TRIG", "Triglycerides", "heart", "mg/dL", None, 150, ("trig", "triglycerides")),
    # --- Kidney (§24) ---
    CanonicalTest(
        "CREAT",
        "Creatinine",
        "kidney",
        "mg/dL",
        0.6,
        1.3,
        ("serum creatinine", "creat", "creatinine", "s. creatinine"),
    ),
    CanonicalTest("EGFR", "eGFR", "kidney", "mL/min/1.73m²", 90, None, ("egfr",)),
    CanonicalTest("UREA", "Blood Urea", "kidney", "mg/dL", 10, 50, ("blood urea", "urea", "bun")),
    CanonicalTest(
        "URICACID",
        "Uric Acid",
        "kidney",
        "mg/dL",
        3.4,
        7.0,
        ("serum uric acid", "uric acid"),
    ),
    CanonicalTest(
        "NA",
        "Sodium",
        "kidney",
        "mmol/L",
        135,
        155,
        ("serum - sodium", "serum-sodium", "serum sodium", "sodium"),
    ),
    CanonicalTest(
        "K",
        "Potassium",
        "kidney",
        "mmol/L",
        3.5,
        5.5,
        ("serum- potassium", "serum - potassium", "serum potassium", "potassium"),
    ),
    CanonicalTest(
        "CL",
        "Chloride",
        "kidney",
        "mmol/L",
        98,
        109,
        ("serum - chloride", "serum-chloride", "serum chloride", "chloride"),
    ),
    # --- Liver (§25) ---
    CanonicalTest(
        "ALT",
        "ALT (SGPT)",
        "liver",
        "U/L",
        7,
        56,
        ("s.g.p.t(alt)", "s.g.p.t (alt)", "s.g.p.t", "sgpt", "alt (sgpt)", "alt"),
    ),
    CanonicalTest(
        "AST",
        "AST (SGOT)",
        "liver",
        "U/L",
        10,
        40,
        ("s.g.o.t(ast)", "s.g.o.t (ast)", "s.g.o.t", "sgot", "ast (sgot)", "ast"),
    ),
    CanonicalTest(
        "GGT",
        "GGT",
        "liver",
        "U/L",
        10,
        50,
        ("g.g.t", "ggt", "gamma glutamyl transpeptidase", "gamma-glutamyl transpeptidase"),
    ),
    CanonicalTest(
        "ALP",
        "Alkaline Phosphatase",
        "liver",
        "U/L",
        53,
        165,
        ("alkaline posphatase", "alkaline phosphatase", "alp"),
    ),
    CanonicalTest(
        "BILI_T",
        "Bilirubin (Total)",
        "liver",
        "mg/dL",
        0.1,
        1.2,
        ("bilirubin - total", "bilirubin total", "total bilirubin", "bilirubin"),
    ),
    CanonicalTest(
        "BILI_D",
        "Bilirubin (Direct)",
        "liver",
        "mg/dL",
        0.0,
        0.4,
        ("bilirubin - direct", "bilirubin direct", "direct bilirubin"),
    ),
    CanonicalTest(
        "BILI_I",
        "Bilirubin (Indirect)",
        "liver",
        "mg/dL",
        0.0,
        0.8,
        ("bilirubin - indirect", "bilirubin indirect", "indirect bilirubin"),
    ),
    CanonicalTest(
        "TPROT",
        "Total Protein",
        "liver",
        "gms/dL",
        6.0,
        8.0,
        ("total proteins", "total protein"),
    ),
    CanonicalTest(
        "ALB",
        "Albumin",
        "liver",
        "gms/dL",
        3.5,
        5.0,
        ("serum albumin", "albumin"),
    ),
    CanonicalTest(
        "GLOB",
        "Globulin",
        "liver",
        "gms/dL",
        1.5,
        3.5,
        ("serum globulin", "globulin"),
    ),
    # --- Thyroid (§26) ---
    CanonicalTest(
        # µIU/mL and mIU/L are numerically identical (1 mIU/L = 1 µIU/mL) —
        # µIU/mL is the notation most commonly printed on real reports.
        "TSH",
        "TSH",
        "thyroid",
        "µIU/mL",
        0.4,
        4,
        ("thyroid stimulating hormone (tsh)", "thyroid stimulating hormone", "tsh"),
    ),
    CanonicalTest(
        "FT4", "Free T4", "thyroid", "ng/dL", 0.8, 1.8, ("ft4", "free t4", "free thyroxine")
    ),
    CanonicalTest(
        "TT3",
        "Triiodothyronine (Total)",
        "thyroid",
        "ng/dL",
        70,
        210,
        ("triiodothyronine total (tt3)", "triiodothyronine total", "tt3"),
    ),
    CanonicalTest(
        "TT4",
        "Thyroxine (Total)",
        "thyroid",
        "ug/dL",
        3.2,
        12.6,
        ("thyroxine (tt4)", "thyroxine total", "tt4"),
    ),
    # --- Diabetes & Metabolic (§27) ---
    CanonicalTest(
        "FBG",
        "Fasting Glucose",
        "diabetes",
        "mg/dL",
        70,
        100,
        (
            "fasting blood sugar",
            "fasting glucose",
            "fasting blood glucose",
            "fbg",
            "fbs",
        ),
    ),
    CanonicalTest(
        "HBA1C",
        "HbA1c",
        "diabetes",
        "%",
        None,
        5.7,
        (
            "glycosylated haemoglobin(hba1c)",
            "glycosylated haemoglobin (hba1c)",
            "glycosylated haemoglobin",
            "glycosylated hemoglobin",
            "hba1c",
            "hb a1c",
        ),
    ),
    CanonicalTest(
        "AMPG",
        "Approximate Mean Plasma Glucose",
        "diabetes",
        "mg/dL",
        90,
        120,
        ("approximate mean plasma glucose",),
    ),
    # --- Vitamins & Minerals (§28) ---
    CanonicalTest(
        "VITD",
        "Vitamin D (25-OH)",
        "vitamins",
        "ng/mL",
        30,
        100,
        ("vitamin d total 25,oh", "vitamin d (25-oh)", "25-oh vitamin d", "vitamin d", "vit d"),
    ),
    CanonicalTest(
        "B12",
        "Vitamin B12",
        "vitamins",
        "pg/mL",
        200,
        900,
        ("vitamin b12 (cyanocobalamine)", "vitamin b12", "b12", "vit b12"),
    ),
    CanonicalTest("CA", "Calcium", "vitamins", "mg/dL", 8.0, 11.0, ("serum calcium", "calcium")),
    CanonicalTest(
        "FE",
        "Iron",
        "vitamins",
        "ug/dL",
        59,
        158,
        ("serum iron", "iron"),
    ),
    CanonicalTest(
        "TIBC",
        "Iron Binding Capacity (TIBC)",
        "vitamins",
        "ug/dL",
        240,
        450,
        ("iron binding capacity -total (tibc)", "iron binding capacity", "tibc"),
    ),
    CanonicalTest(
        "TRANSFERRIN",
        "Transferrin",
        "vitamins",
        "ug/dL",
        170,
        280,
        ("transferritin", "transferrin"),
    ),
    CanonicalTest(
        "TRANSFERRIN_SAT",
        "Transferrin Saturation",
        "vitamins",
        "%",
        20,
        40,
        ("transferrin saturation",),
    ),
    CanonicalTest(
        "FERRITIN",
        "Ferritin",
        "vitamins",
        "ng/mL",
        20,
        291,
        ("serum ferritin", "ferritin"),
    ),
    # --- Hormones ---
    CanonicalTest(
        "RENIN",
        "Renin Activity",
        "hormones",
        "ng/ml/hr",
        0.15,
        2.33,
        ("renin activity", "renin"),
    ),
    CanonicalTest(
        "ALDO",
        "Aldosterone",
        "hormones",
        "ng/dL",
        2.52,
        39.2,
        ("aldosterone,serum", "aldosterone"),
    ),
    # --- Urine (numeric-only findings — see lab_extraction.py's module
    # docstring on qualitative results like "Present/Absent" not being
    # extracted by this deterministic numeric parser) ---
    CanonicalTest(
        "USG", "Urine Specific Gravity", "urine", "", 1.000, 1.030, ("specific gravity",)
    ),
    CanonicalTest("UPH", "Urine pH", "urine", "", 5.0, 8.0, ("reaction(ph)", "reaction (ph)")),
    # --- Allergy ---
    CanonicalTest("IGE", "Total IgE", "allergy", "IU/mL", None, 423, ("total ige", "ige")),
    # --- Tumor markers ---
    CanonicalTest(
        "PSA",
        "Prostate Specific Antigen",
        "tumor_markers",
        "ng/ml",
        None,
        4.0,
        (
            "prostate specific antigen (total)",
            "prostate specific antigen",
            "prostate-specific antigen",
            "psa",
        ),
    ),
)

_BY_ALIAS: dict[str, CanonicalTest] = {}
for _test in CANONICAL_TESTS:
    _BY_ALIAS[_test.name.lower()] = _test
    for _alias in _test.aliases:
        _BY_ALIAS[_alias.lower()] = _test

# Longest aliases first, so e.g. "mchc" matches before "mch" would, and
# "triglycerides" before a hypothetical shorter overlapping alias.
_ALIASES_BY_LENGTH = sorted(_BY_ALIAS.keys(), key=len, reverse=True)


def match_canonical_test(text: str) -> CanonicalTest | None:
    """Finds a known test alias at the start of a line of OCR text. Returns
    the matched CanonicalTest, or None if nothing recognized."""
    lowered = text.strip().lower()
    for alias in _ALIASES_BY_LENGTH:
        if lowered.startswith(alias):
            remainder = lowered[len(alias) :]
            if remainder == "" or not remainder[0].isalnum():
                return _BY_ALIAS[alias]
    return None


def get_by_code(code: str) -> CanonicalTest | None:
    for test in CANONICAL_TESTS:
        if test.code == code:
            return test
    return None
