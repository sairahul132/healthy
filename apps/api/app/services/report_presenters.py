"""ORM -> response-schema conversion for lab reports/results, shared by
ReportsService (the owning patient's own view) and SharingService/
DoctorService (an authorized recipient's view of someone else's results) —
one place to keep the wire shape consistent across all three.
"""

from app.db.models import LabReport, LabResult
from app.schemas.reports import ClinicalStatusResponse, LabReportResponse, LabResultResponse


def report_to_response(report: LabReport, categories: list[str]) -> LabReportResponse:
    return LabReportResponse(
        id=str(report.id),
        file_name=report.file_name,
        status=report.status.value,
        failure_reason=report.failure_reason,
        collection_date=report.collection_date,
        lab_name=report.lab_name,
        categories=categories,
        uploaded_at=report.created_at,
        result_count=report.result_count,
        abnormal_count=report.abnormal_count,
    )


def result_to_response(result: LabResult) -> LabResultResponse:
    return LabResultResponse(
        id=str(result.id),
        report_id=str(result.report_id),
        test_name=result.test_name,
        canonical_test_name=result.canonical_test_name,
        value=result.value,
        unit=result.unit,
        normalized_value=result.normalized_value,
        normalized_unit=result.normalized_unit,
        reference_low=result.reference_low,
        reference_high=result.reference_high,
        reference_text=result.reference_text,
        category=result.category,
        status=ClinicalStatusResponse(
            direction=result.status_direction,
            severity=result.status_severity,
            label=result.status_label,
        ),
        previous_value=result.previous_value,
        previous_collection_date=result.previous_collection_date,
        extraction_confidence=result.extraction_confidence,
        collection_date=result.collection_date,
    )
