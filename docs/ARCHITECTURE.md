# Healthy — Architecture (Phase 1 scope)

Full product vision lives in `docs/SPEC.md` (the original 171-section master prompt). This
document describes what we are actually building right now and how it fits the eventual
production architecture.

## Service boundaries (target — built incrementally)

```
apps/web        Next.js (App Router, TS strict) — patient-facing UI
apps/admin      Next.js — internal admin console (separate app, separate auth, minimal access)
apps/api        FastAPI — REST API. Internally layered, not one blob:
                  api/          route handlers only — no business logic
                  services/     business logic (auth, health data, sharing, audit...)
                  repositories/ DB access, one repo per aggregate
                  providers/    external integrations behind interfaces (OTP, storage, OCR, AI)
                  db/models/    SQLAlchemy models
                  core/         config, security primitives (hashing, tokens, ID generation)
apps/worker     Celery workers — async OCR/extraction/notification jobs (Phase 2+)
packages/types  Shared TS types generated from the OpenAPI schema (frontend/backend contract)
```

Identity, health data, documents, consent/sharing, audit, and AI processing are separate
service *modules* with distinct DB schemas/table prefixes now, with a path to becoming
separate deployable services later if scale requires it (§9 of the spec: data segregation).

## Phase 1 (this build)

- User registration/login via **OTP only** (no password required, matches §10)
- Healthy ID generation (§11) — random, non-sequential, doesn't leak phone/email/DB id
- Health profile (subset of §13 fields — non-sensitive ones first)
- Session management: short-lived access token + rotating refresh, httponly secure cookies
- Immutable audit log (append-only, §54/§55) for every auth event
- Redis-backed rate limiting on OTP requests and login attempts (§104)
- Local dev stack: Postgres, Redis, MinIO (S3-compatible, stands in for AWS S3 in dev)

**Explicitly deferred to later phases** (not stubbed, not faked — just not present yet):
MFA/passkeys, doctor portal, report upload/OCR, sharing/consent engine, AI features,
notifications, family profiles, emergency access. See `docs/ROADMAP.md`.

## Provider abstraction pattern (§137/§138/§159)

External integrations (OTP/SMS delivery, object storage, OCR, AI) are accessed only through
an interface defined in `app/providers/`. Local development uses an explicit `Mock*Provider`
that is clearly named/logged as MOCK (e.g. OTP codes are logged to the API console instead of
sent via SMS). Production wiring (real SMS provider, real AWS S3, real OCR/AI provider) is a
config change (`.env` → which provider class is instantiated), not a code rewrite. We are
building for "real product heading to production," so every provider interface is designed
against the real provider's actual contract, not simplified for the mock's convenience.

## Data flow — auth (Phase 1)

```
POST /api/v1/auth/register {identifier: phone|email}
  → create pending user, generate OTP challenge (hashed, Redis+DB), send via OTPProvider
POST /api/v1/auth/verify-otp {identifier, code}
  → verify hash, rate-limit checked, create user + healthy_id + health_profile (tx)
  → issue session (access + refresh), write audit_logs row
POST /api/v1/auth/login {identifier} → same OTP challenge flow for existing users
GET  /users/me → requires valid session, returns profile scoped to the authenticated user only
```

Every DB write for the above happens inside a transaction (§69). Authorization is enforced
server-side only — there is no client-trusted role/permission check anywhere (§67).
