# Healthify — API

FastAPI backend. Phase 1 scope (see [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)):
OTP auth, health profile, and patient-controlled sharing (§42-57). Reports/
OCR (§76) are Phase 2 and not implemented — `apps/web`'s Reports/Timeline
screens run entirely on a client-side mock for that reason (see
`apps/web/lib/mock/`).

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
DATABASE_URL=sqlite+aiosqlite:///./healthify_dev.db
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

17 tests covering the full auth flow (register → OTP → session → refresh →
logout) and the sharing lifecycle end-to-end: create a share, reject a
recipient with the wrong identifier, OTP-verify the right one, request
access to an ungranted category, patient declines (still blocked) then
approves (now visible), revoke (immediately blocked again), and
cross-patient isolation (patient B can't touch patient A's sessions).
Uses an in-memory SQLite DB per test run — see `tests/conftest.py`.

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

Deliberately not implemented (Phase 2+, see `docs/ROADMAP.md`): report
upload/OCR, prescriptions, medicines, doctor portal, admin console, AI
features. The sharing feature grants access at the **health category**
level only — there's no report content on the backend yet to actually
serve once granted, and `ShareCategoriesResponse.dataNote` says so
explicitly rather than the API fabricating placeholder data.
