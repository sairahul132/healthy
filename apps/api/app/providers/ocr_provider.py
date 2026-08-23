"""Document text extraction provider abstraction (docs/SPEC.md §138
OCRProvider). Real text-layer extraction for PDF/plain-text/CSV documents
via pypdf — genuinely reads the file, not mocked. True OCR (recognizing
text in a scanned image with no embedded text layer) needs an engine like
Tesseract or a cloud OCR API; neither is installable in this environment
(no system package manager, no network access to a paid API), so image
uploads (.jpg/.png) get a clearly-labeled low-confidence empty result
rather than a faked success — see `_UNAVAILABLE_FOR_IMAGES` below. A real
OCR engine plugs in behind the same `extract_text()` interface later.
"""

import io
from dataclasses import dataclass
from typing import Protocol

_UNAVAILABLE_FOR_IMAGES = (
    "No OCR engine is configured for scanned images in this environment. "
    "Upload a text-based PDF, or a .txt/.csv export of the report, instead."
)


@dataclass(frozen=True)
class OcrResult:
    text: str
    confidence: float
    engine: str


class OcrProvider(Protocol):
    async def extract_text(self, data: bytes, mime_type: str) -> OcrResult: ...


class TextLayerOcrProvider:
    """Real extraction for documents that already carry a text layer."""

    async def extract_text(self, data: bytes, mime_type: str) -> OcrResult:
        if mime_type == "application/pdf":
            return self._extract_pdf(data)
        if mime_type in ("text/plain", "text/csv"):
            return OcrResult(
                text=data.decode("utf-8", errors="ignore"), confidence=1.0, engine="text"
            )
        return OcrResult(text="", confidence=0.0, engine="none:" + _UNAVAILABLE_FOR_IMAGES)

    def _extract_pdf(self, data: bytes) -> OcrResult:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages_text)
        # A PDF with no extractable text layer is a scanned image saved as
        # PDF — same limitation as a raw image upload, be honest about it.
        if not text.strip():
            return OcrResult(text="", confidence=0.0, engine="pypdf:" + _UNAVAILABLE_FOR_IMAGES)
        return OcrResult(text=text, confidence=0.95, engine="pypdf")


def get_ocr_provider() -> OcrProvider:
    return TextLayerOcrProvider()
