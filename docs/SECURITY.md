# Healthy — Security model (Phase 1 scope)

Full threat model (§152) gets its own doc once sharing/doctor-portal land — those are where
most of the interesting threats live (IDOR, token guessing, cross-user leakage). This covers
what Phase 1 actually implements.

## Authentication

- OTP-only, no password required. OTP codes: 6 digits, argon2-hashed at rest, 5-minute
  expiry, max 5 verification attempts per challenge (then the challenge is invalidated).
- Rate limits (Redis, sliding window): OTP requests — 3 per identifier per 10 min, 10 per IP
  per hour. OTP verification — 5 attempts per challenge, then must request a new OTP.
- Sessions: short-lived access token (15 min, JWT, holds only `user_id` + `session_id` — no
  PII, no health data per §136) + rotating refresh token (30 days, opaque random value,
  hashed in DB, httponly/secure/samesite=strict cookie). Refresh rotates on every use;
  reuse of a stale refresh token revokes the whole session family (replay detection).

## Data protection

- `user_identities.identity_value_encrypted` uses AES-256-GCM via envelope encryption
  (application holds a data-encryption key wrapped by a master key from the secrets
  manager/KMS — local dev uses a dev-only static key file that is gitignored and never used
  outside `docker-compose`).
- Lookups on phone/email use an HMAC-SHA256 keyed hash column, never plaintext `LIKE`/`=`.
- All Postgres access is parameterized via SQLAlchemy — no raw string interpolation of user
  input anywhere in the codebase.

## Authorization

- Every authenticated route resolves the current user server-side from the session; there is
  no endpoint that trusts a client-supplied user/role identifier for authorization decisions.
- `GET /users/me` and all future resource endpoints scope every query by the authenticated
  user's id — cross-user access is a query-shape bug, not a missing check, so it gets a
  dedicated automated test per user-facing resource (§70, §99) as each resource type ships.

## Audit logging

- Every auth event (`OTP_REQUESTED`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `SESSION_CREATED`,
  `SESSION_REVOKED`) writes an append-only `audit_logs` row before the response is returned.
- The API's DB role cannot `UPDATE`/`DELETE` `audit_logs` (enforced via a dedicated Postgres
  role + GRANTs, not just app-layer discipline).

## What's explicitly NOT done yet (tracked, not hidden)

MFA/passkeys, device-risk scoring, CSP/security headers tuned for the real frontend, WAF/edge
rate limiting, secrets manager integration (using `.env` locally, which is gitignored) — these
land as the relevant phases (auth hardening pass, deployment) are built. No feature in this
phase ships with commented-out or TODO'd security (§160/§161) — if something isn't in this
list, it isn't in the code path yet either.
