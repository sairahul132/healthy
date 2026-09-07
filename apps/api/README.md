# Healthy — API

FastAPI backend. Covers Phase 1 (see [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)):
OTP auth, health profile, and patient-controlled sharing (§42-57); Phase 2:
report upload/processing pipeline, lab-result extraction, unit
normalization, health categories, and the deterministic clinical status
engine (§15/§16/§18-30/§76); Phase 3: health-category views, trends,
timeline, and search (§31/§37/§62/§145); Phase 4: sharing now serves real
report results for a granted category, not just a boolean flag; Phase 5:
a doctor portal on top of the same OTP-auth accounts (§40/§41); and Phase
6: prescription upload/OCR and medicine management (§38/§39).

## Local development (no Docker/Postgres required)

`docker-compose.yml` at the repo root is the intended production-shaped
dev environment (Postgres, Redis, MinIO), but none of those are assumed
available here. Every model uses dialect-portable column types
(`app/db/types.py`) so the exact same code runs on SQLite locally and
Postgres in `docker-compose.yml` — nothing to change either way.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env   # or hand-write one — see below for the SQLite defaults
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

A working `.env` for local dev (no Postgres/Redis needed):

```
DATABASE_URL=sqlite+aiosqlite:///./healthy_dev.db
REDIS_URL=redis://localhost:6379/0
JWT_SIGNING_KEY=dev-only-change-me-00000000000000000000000000000000
FIELD_ENCRYPTION_KEY=dev-only-change-me-00000000000000000000000000000000
OTP_PROVIDER=mock
CORS_ALLOW_ORIGINS=http://localhost:3000
```

`REDIS_URL` is required by `Settings` but never actually connected to —
rate limiting falls back to an in-memory limiter when Redis isn't
configured for real (`app/providers/rate_limiter.py`). Same pattern as
`OTP_PROVIDER=mock`: a working provider that isn't the real one yet, not a
stub that fails.

**Where OTP codes go:** `OTP_PROVIDER=mock` logs codes to this server's
own console/log — `MOCK OTP for <identifier>: <code>` — instead of sending
SMS/email. Check the terminal running `uvicorn`, not the browser.

### Real SMS OTP

Create a Twilio account, verify a destination number on a trial account (or
use a purchased Twilio number), then configure the API host with:

```text
ENVIRONMENT=production
OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+15551234567
```

The login identifier must be an E.164 phone number such as `+14155552671`.
Never commit these secrets. Twilio SMS is paid after trial credit; there is no
reliable permanently free SMS provider.

## Verify it's working

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

Interactive API docs: http://localhost:8000/docs

## Tests

```bash
pytest -v
```

37 tests: the full auth flow (register → OTP → session → refresh →
logout); the sharing lifecycle end-to-end (create a share, reject a
recipient with the wrong identifier, OTP-verify the right one, request
access to an ungranted category, patient declines/approves, revoke,
cross-patient isolation, and — now that reports are real — that a granted
category actually returns results while an ungranted one still 403s); the
report pipeline (upload → process → extract → categorize → status,
EICAR/malware rejection, unrecognized documents failing cleanly, trend
continuity across reports, category/timeline/search endpoints, and
cross-user report isolation — §99's critical security test applied to
reports); the doctor portal (registration starts pending, an unverified
doctor is blocked from the patient list, a verified doctor sees a linked
patient's granted results and is blocked from ungranted ones, and one
doctor can't reach another doctor's linked session); and prescriptions/
medicines (extraction, correction preserving the original value,
cross-user isolation, manual medicine CRUD, timeline integration). Uses an
in-memory SQLite DB per test run — see `tests/conftest.py`.

## Code quality

```bash
ruff check app tests
mypy app
```

## What's actually implemented vs. scaffolding

Real, tested, and running:
- `/auth/register`, `/auth/login`, `/auth/verify-otp`, `/auth/refresh`, `/auth/logout`
- `/users/me` (GET/PATCH)
- `/sharing/sessions` (create/list/revoke), `/sharing/requests` (list/approve/decline)
- `/share/{token}` and its sub-routes — the recipient-facing side of sharing
- `/reports/upload`, `/reports`, `/reports/{id}`, `/reports/{id}/results` —
  real upload → malware-scan → text-extraction → deterministic lab-value
  parsing → unit normalization → categorization → clinical-status pipeline,
  running as a FastAPI background task (`docs/ROADMAP.md` Phase 2)
- `/health/categories`, `/health/categories/{id}`, `/health/trends` — health
  category browsing and time-series trends per test (Phase 3)
- `/timeline`, `/search` — chronological events and cross-report search (Phase 3)
- `/share/{token}/categories/{category}/results` — a granted category now
  serves the real extracted results in it, still enforced server-side per
  request (Phase 4)
- `/doctors/register`, `/doctors/me`, `/doctors/patients`,
  `/doctors/patients/{sessionId}/categories(/{category}/results)` — doctor
  registration + a persistent dashboard of patients who've shared with the
  doctor's verified identifier (Phase 5)
- `/prescriptions/upload`, `/prescriptions`, `/prescriptions/{id}`,
  `/prescriptions/{id}/items`, `PATCH .../items/{itemId}` — prescription
  OCR/extraction with a correction workflow (Phase 6)
- `/medicines` (POST/GET), `PATCH /medicines/{id}` — manual medicine
  management (Phase 6)

Two providers are real-but-limited rather than faked — see the root
[`README.md`](../../README.md#whats-real-vs-simplified-for-local-dev) for
why (no system package manager in this sandbox, no OCR/AV engine
installable): `virus_scan_provider.py` is a clearly-labeled mock (still
rejects the real EICAR test file), and `ocr_provider.py` does genuine text
extraction for PDF/TXT/CSV but can't OCR scanned images — that's a config
change away from a real engine, not a rewrite, same as `OTP_PROVIDER=mock`.
Prescriptions reuse the same two providers, so the same limitation applies
there too.

**Doctor verification is a real but manual workflow**, not an API a doctor
can self-approve through (§131): `scripts/verify_doctor.py <identifier>` is
the operator action that flips a registered doctor to `verified` — there's
no admin console yet to do this through a UI.

Deliberately not implemented (see `docs/ROADMAP.md` for the exact
per-phase checklist): a formal `docs/THREAT_MODEL.md` and dedicated IDOR
test suite beyond what's already in the test files (§99/§100/§152);
finer-grained sharing access levels beyond category (§50/§51 — specific
test, original document); medication reminders (§39, needs a notification
system that doesn't exist); admin console; AI features.
