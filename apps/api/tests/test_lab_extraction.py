"""Unit tests for app/services/lab_extraction.py — regression coverage for
bugs found and fixed while validating against real (non-synthetic) lab
report text: comma-grouped numbers, multi-line "name / (Method: ...) /
value" layouts, duplicate name lines, one-sided reference ranges, and
multi-tier reference tables that must not be misread as a single range.
None of this uses real patient documents — every fixture below is
hand-written to reproduce a specific real-world formatting quirk.
"""

from app.services.lab_extraction import extract_results


def _by_code(results, code):
    return next(r for r in results if r.canonical.code == code)


def test_comma_grouped_number_is_parsed_correctly():
    text = "WBC Cout     8,300  Cells/cu mm 4,000 - 10,000"
    results = extract_results(text)
    wbc = _by_code(results, "WBC")
    assert wbc.value == 8300.0
    assert wbc.reference_low == 4000.0
    assert wbc.reference_high == 10000.0


def test_name_and_value_split_across_a_method_annotation_line():
    text = "RDW (CV)\n(Method :Calculated )\n    12.6  % 11.6-14.0"
    results = extract_results(text)
    rdw = _by_code(results, "RDW")
    assert rdw.value == 12.6
    assert rdw.reference_low == 11.6
    assert rdw.reference_high == 14.0


def test_duplicate_name_line_before_method_annotation_still_resolves():
    """Some labs print a section header and the investigation name as two
    near-identical consecutive lines before the method/value — e.g.
    "Aldosterone" then "Aldosterone,Serum" then "(Method: ...)" then the
    value. The value must still be found."""
    text = "Aldosterone\nAldosterone,Serum\n(Method :CLIA )\n    29.1  ng/dL Upright: 2.52-39.2"
    results = extract_results(text)
    aldo = _by_code(results, "ALDO")
    assert aldo.value == 29.1


def test_section_header_immediately_before_column_header_is_not_a_data_row():
    text = (
        "Iron -Profile\n"
        "INVESTIGATION RESULT UNITS NORMAL RANGE\n"
        "Serum Iron\n"
        "(Method :Ferene )\n"
        "    83.2  ug/dL 59 - 158\n"
    )
    results = extract_results(text)
    iron = _by_code(results, "FE")
    assert iron.value == 83.2
    assert iron.test_name == "Serum Iron"  # not the section header


def test_one_sided_upto_range_is_recognized():
    text = "Bilirubin - Total\n(Method :Modified jendrassik )\n    1.7 *  mg/dL Upto 1.4"
    results = extract_results(text)
    bili = _by_code(results, "BILI_T")
    assert bili.value == 1.7
    assert bili.reference_low is None
    assert bili.reference_high == 1.4


def test_multi_tier_risk_table_falls_back_to_registry_default_not_wrong_tier():
    """A healthy LDL of 95 (Optimal, <100) must not be misread as LOW just
    because "Near Optimal :100-129" also appears in the reference text."""
    text = (
        "L.D.L Cholesterol\n"
        "(Method :Calculated )\n"
        "    95.2  mg/dL Optimal :<100 mg/dlNear Optimal :100-129Borderline High :130-159"
    )
    results = extract_results(text)
    ldl = _by_code(results, "LDL")
    assert ldl.value == 95.2
    assert ldl.reference_low is None
    assert ldl.reference_high == 100  # registry default, not the "Near Optimal" tier's 100-129


def test_age_bracket_table_falls_back_to_registry_default():
    text = (
        "Thyroid Stimulating Hormone (TSH)\n"
        "(Method :CLIA )\n"
        "    0.72  µIU/mL Adult21 wks -20Yrs :0.70-6.40 µIU/mL21 - 54 yrs :0.35-5.50 µIU/mL"
    )
    results = extract_results(text)
    tsh = _by_code(results, "TSH")
    assert tsh.value == 0.72
    assert (tsh.reference_low, tsh.reference_high) == (0.4, 4)  # registry default


def test_mismatched_unit_prefers_documents_own_range_over_registry_default():
    """Platelet count reported in "lakhs/cu mm" (Indian units) must not be
    compared against the registry's 10^3/µL range — that would read 2.41
    as wildly LOW against a 150-450 range meant for a different unit."""
    text = "Platelet Count     2.41  lakhs/cu mm Adults:1.50 - 4.50Childrens:1.80-4.50"
    results = extract_results(text)
    plt = _by_code(results, "PLT")
    assert plt.value == 2.41
    assert plt.unit == "lakhs/cu"
    assert plt.reference_low == 1.50
    assert plt.reference_high == 4.50


def test_prose_sentence_does_not_produce_a_false_result():
    """ "LDL cholesterol cannot be calculated if triglyceride is >400
    mg/dL" is an interpretation sentence, not a data row, even though it
    starts with an LDL alias and contains a number."""
    text = (
        "L.D.L Cholesterol\n"
        "(Method :Calculated )\n"
        "    95.2  mg/dL Optimal :<100 mg/dl\n"
        "Note:\n"
        "LDL cholesterol cannot be calculated if triglyceride is >400 mg/dL (Friedewald's formula)."
    )
    results = extract_results(text)
    ldl_matches = [r for r in results if r.canonical.code == "LDL"]
    assert len(ldl_matches) == 1
    assert ldl_matches[0].value == 95.2  # the real row, not 400 from the prose


def test_new_registry_entries_are_matched():
    text = (
        "RBC Count     5.4  millions/cu mm Male:4.50-5.90\n"
        "MCV     81.5  fl 76.0 - 96.0\n"
        "Serum - Sodium     138  mmol/L 135  -  155\n"
        "G.G.T     20  U/L Male : 10 - 50\n"
    )
    results = extract_results(text)
    codes = {r.canonical.code for r in results}
    assert {"RBC", "MCV", "NA", "GGT"} <= codes
