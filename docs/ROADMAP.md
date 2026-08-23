# Healthy — Implementation roadmap

Phase order follows §149 of the master spec. Each phase ends with a check-in before the next
one starts — we don't move forward silently.

- [ ] **Phase 1 — Foundation** *(in progress)*
  - [x] Repo scaffold (monorepo, docker-compose, docs)
  - [ ] Backend foundation (FastAPI layered skeleton)
  - [ ] Postgres + Alembic (Phase 1 schema per `docs/DATABASE.md`)
  - [ ] OTP-based auth (register, verify, login, session, refresh, logout)
  - [ ] Healthy ID generation
  - [ ] Health profile (basic fields)
  - [ ] Object storage wiring (MinIO locally, S3-compatible interface)
  - [ ] Envelope encryption for PII fields
  - [ ] Append-only audit logging
  - [ ] Frontend foundation (Next.js, auth screens, dashboard shell)
  - [ ] Security tests: cross-user access, OTP brute force, rate limits

- [x] **Phase 2 — Reports & lab data**
  Upload pipeline, virus scan, OCR, extraction, unit/reference-range normalization, health
  categories, deterministic status engine, report detail UI.
  - [x] Upload pipeline (validate → store → async background-task pipeline, §15/§76)
  - [x] Virus/malware scan — provider-abstracted; mock in this environment (no AV engine
    installable here), rejects the real EICAR test file for real (see `apps/api/README.md`)
  - [x] OCR/text extraction — provider-abstracted; real for PDF/TXT/CSV via `pypdf`, honestly
    fails scanned images/image-only PDFs rather than faking a result (no OCR engine available)
  - [x] Deterministic lab-value extraction, unit normalization, health-category classification
    — the parser (`app/services/lab_extraction.py`) and the ~55-test canonical registry
    (`app/core/canonical_tests.py`) were validated against real (non-mock) multi-page lab
    report PDFs, not just clean synthetic fixtures: it handles thousand-separated numbers
    ("8,300"), test name/value split across a "(Method: ...)" annotation line, one-sided
    reference ranges ("Upto 1.4"), and rejects both prose false-positives and multi-tier/
    age-bracketed reference tables (falls back to the registry's adult default rather than
    risk misreading the wrong tier as the range — see the module's docstring for why).
    Known gap: qualitative results ("Present"/"Absent"/color/turbidity, e.g. most of a
    urine routine exam) aren't extracted — the pipeline is numeric-value-only by design.
  - [x] Report collection date extraction (`app/services/report_metadata_extraction.py`,
    matches "Sample Collection:"/"Collected On:" labels) — used for the dashboard's
    "recent reports" date and, more importantly, for ordering trend/previous-value
    comparisons by actual collection date rather than upload order, so uploading an
    older report after a newer one doesn't invert the trend direction
  - [x] Deterministic clinical status engine (backend, mirrors `apps/web`'s status-engine.ts)
  - [x] Report detail UI, wired to the real backend (no more mock provider by default)

- [x] **Phase 3 — Dashboard, trends, timeline, search**
  - [x] Dashboard — now reflects real uploaded reports/categories, not mock data
  - [x] Health category pages + per-test trend charts (`/health`, `/health/[id]`)
  - [x] Timeline — real events from processed reports
  - [x] Search — cross-report/result search (`/search`)

- [x] **Phase 4 — Sharing & consent**
  Sharing sessions, OTP recipient verification, granular permissions, access requests,
  approve/decline, expiration, revocation, audit — this is the highest-risk phase from a
  security standpoint and gets the dedicated threat model + IDOR test suite from §99/§100.
  - [x] Sharing sessions, OTP recipient verification, access requests, approve/decline,
    expiration, revocation, audit (built ahead of this roadmap entry, alongside Phase 1)
  - [x] Category grants now serve the real extracted results within them, not just a
    boolean "authorized" flag — `GET /share/{token}/categories/{category}/results`,
    still fully re-checked server-side per request (§67), never trusting what the
    frontend already displayed
  - [ ] Formal `docs/THREAT_MODEL.md` (§152) and a dedicated IDOR test suite beyond the
    cross-user/cross-session tests already in `tests/test_sharing.py` — not done
  - [ ] Finer-grained access levels beyond category (§50/§51: specific test, original
    document) — category-level is what's enforced; not done

- [x] **Phase 5 — Doctor portal**
  Doctor registration + verification workflow, doctor dashboard, patient sharing consumption.
  - [x] Doctor registration on top of the existing OTP-auth account (`POST /doctors/register`)
  - [x] Verification workflow — real, but manual: `apps/api/scripts/verify_doctor.py`, an
    operator-run script, not an API a doctor could self-approve through (§131); no admin
    console exists yet to do this through a UI
  - [x] Doctor dashboard (`/doctor`) — patients who've shared with the doctor's verified
    identifier, linked automatically the first time they OTP-verify a share (never before
    verification, never bypassing the original link+OTP requirement)
  - [x] Patient sharing consumption — same category-scope enforcement as the public
    recipient flow, reusing the same authorization check, not a separate weaker path

- [x] **Phase 6 — Prescriptions & medicines**
  - [x] Prescription upload/OCR pipeline, reusing the same storage/virus-scan/OCR providers
    as reports (`/prescriptions/upload`)
  - [x] Deterministic (non-AI) medicine-line extraction with per-item confidence
  - [x] Correction workflow (§96/§143) — original extracted value preserved alongside any
    user correction, never silently overwritten (`PATCH /prescriptions/{id}/items/{id}`)
  - [x] Medicine management (§39) — manual add/edit/active-toggle, independent of
    prescription OCR (`/medicines`)
  - [ ] Medication reminders (§39) — needs a notification system that doesn't exist yet;
    not done

- [x] **Phase 7 — AI features**
  Provider abstraction first, then explanation/comparison/doctor-summary/Ask Healthy, all
  scoped per-user with prompt-injection defenses for document content (§153/§154).
  - [x] AI provider abstraction (`app/providers/ai_provider.py`) — `MockAiProvider` only so
    far, clearly labeled, no network call; swapping in a real model is a config change
    (`AI_PROVIDER`), matching the OTP/OCR/virus-scan/storage pattern
  - [x] Prompt-injection containment (§153/§154, `app/core/ai_prompt_safety.py`) — every
    prompt prefers deterministic structured fields (canonical test name, computed status/
    trend) over raw OCR text; the one open-vocabulary exception (medicine names) is
    delimited/truncated before reaching the model. The provider has no tool-calling or
    write access — pure text in, text out — so an injection can only taint its own reply
  - [x] Explain a result (`POST /ai/results/{id}/explain`) — wired into `ResultRow`
  - [x] Compare two reports (`POST /ai/reports/{id}/compare`, defaults to the immediately
    preceding report, optional explicit `compareToReportId`) — wired into the report detail
    page, with a graceful message when there's no earlier report
  - [x] Doctor-visit summary (`POST /ai/doctor-summary`, 90-day window with a
    fallback so infrequent uploaders never see an empty summary) — new `/doctor-summary`
    page, linked from `/reports`
  - [x] Ask Healthy chat (`/ai/conversations`, persisted `AiConversation`/`AiMessage`) — new
    `/ask` page (nav entry flipped on), context snapshot computed once per conversation
    rather than re-scanned every turn
  - [x] Per-user rate limiting and audit events on every AI endpoint; cross-user isolation
    tests alongside the feature tests (`tests/test_ai.py`)

- [ ] **Phase 8 — Emergency profile, family profiles, ABDM/FHIR/lab integrations**

## Ground rules carried through every phase (from the spec, not negotiable)

- No feature ships without: backend, frontend, DB schema, validation, authorization, audit
  logging where relevant, tests, and error handling (§170 "Definition of Done").
- No placeholder security, no mock security, no faked provider claiming to be connected when
  it isn't (§159–§161).
- Every provider integration (SMS/OTP, storage, OCR, AI) sits behind an interface so swapping
  the real vendor in later is a config change.
