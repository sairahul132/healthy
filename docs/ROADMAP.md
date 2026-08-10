# Healthify — Implementation roadmap

Phase order follows §149 of the master spec. Each phase ends with a check-in before the next
one starts — we don't move forward silently.

- [ ] **Phase 1 — Foundation** *(in progress)*
  - [x] Repo scaffold (monorepo, docker-compose, docs)
  - [ ] Backend foundation (FastAPI layered skeleton)
  - [ ] Postgres + Alembic (Phase 1 schema per `docs/DATABASE.md`)
  - [ ] OTP-based auth (register, verify, login, session, refresh, logout)
  - [ ] Healthify ID generation
  - [ ] Health profile (basic fields)
  - [ ] Object storage wiring (MinIO locally, S3-compatible interface)
  - [ ] Envelope encryption for PII fields
  - [ ] Append-only audit logging
  - [ ] Frontend foundation (Next.js, auth screens, dashboard shell)
  - [ ] Security tests: cross-user access, OTP brute force, rate limits

- [ ] **Phase 2 — Reports & lab data**
  Upload pipeline, virus scan, OCR, extraction, unit/reference-range normalization, health
  categories, deterministic status engine, report detail UI.

- [ ] **Phase 3 — Dashboard, trends, timeline, search**

- [ ] **Phase 4 — Sharing & consent**
  Sharing sessions, OTP recipient verification, granular permissions, access requests,
  approve/decline, expiration, revocation, audit — this is the highest-risk phase from a
  security standpoint and gets the dedicated threat model + IDOR test suite from §99/§100.

- [ ] **Phase 5 — Doctor portal**
  Doctor registration + verification workflow, doctor dashboard, patient sharing consumption.

- [ ] **Phase 6 — Prescriptions & medicines**

- [ ] **Phase 7 — AI features**
  Provider abstraction first, then explanation/comparison/doctor-summary/Ask Healthify, all
  scoped per-user with prompt-injection defenses for document content (§153/§154).

- [ ] **Phase 8 — Emergency profile, family profiles, ABDM/FHIR/lab integrations**

## Ground rules carried through every phase (from the spec, not negotiable)

- No feature ships without: backend, frontend, DB schema, validation, authorization, audit
  logging where relevant, tests, and error handling (§170 "Definition of Done").
- No placeholder security, no mock security, no faked provider claiming to be connected when
  it isn't (§159–§161).
- Every provider integration (SMS/OTP, storage, OCR, AI) sits behind an interface so swapping
  the real vendor in later is a config change.
