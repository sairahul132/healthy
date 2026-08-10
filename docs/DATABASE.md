# Healthify — Database (Phase 1 schema)

Full target schema is the ~30 tables listed in the master spec (§68). We are creating only
the tables Phase 1 needs; later phases add tables via new Alembic migrations rather than
altering this design out from under itself.

## ER diagram — Phase 1

```mermaid
erDiagram
    USERS ||--o{ USER_IDENTITIES : has
    USERS ||--|| HEALTHIFY_IDS : has
    USERS ||--|| HEALTH_PROFILES : has
    USERS ||--o{ DEVICES : registers
    USERS ||--o{ SESSIONS : has
    USERS ||--o{ OTP_CHALLENGES : requests
    USERS ||--o{ AUDIT_LOGS : "acts as subject of"
    SESSIONS }o--|| DEVICES : "bound to"

    USERS {
        uuid id PK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
        bool is_active
    }

    USER_IDENTITIES {
        uuid id PK
        uuid user_id FK
        enum identity_type "phone|email"
        text identity_value_encrypted
        text identity_value_hash "for lookup, HMAC not reversible"
        bool verified
        timestamptz verified_at
    }

    HEALTHIFY_IDS {
        uuid id PK
        uuid user_id FK
        text healthify_id UK "HFY-XXXX-XXXX, random"
        timestamptz created_at
    }

    HEALTH_PROFILES {
        uuid id PK
        uuid user_id FK
        text display_name
        date date_of_birth
        enum sex
        text blood_group
        text preferred_language
        int version
        timestamptz updated_at
    }

    DEVICES {
        uuid id PK
        uuid user_id FK
        text device_fingerprint_hash
        text label
        timestamptz first_seen_at
        timestamptz last_seen_at
        bool revoked
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid device_id FK
        text refresh_token_hash
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }

    OTP_CHALLENGES {
        uuid id PK
        uuid user_id FK "nullable — pre-registration"
        text identity_value_hash
        text otp_code_hash
        int attempt_count
        timestamptz expires_at
        timestamptz consumed_at
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_user_id FK "nullable — system/anonymous actions"
        text event_type
        text resource_type
        text resource_id
        text outcome "success|failure"
        jsonb metadata
        text prev_hash "hash chain for tamper-evidence"
        text row_hash
        timestamptz created_at
    }
```

## Key decisions

- **PII vs. identity separation (§9):** `user_identities` stores phone/email *encrypted*
  plus a keyed-hash (HMAC) column for equality lookup — the plaintext is never queried
  directly, and no other table stores phone/email at all. `health_profiles` never contains
  a phone/email column.
- **Healthify ID (§11):** generated from a CSPRNG, checked for uniqueness against
  `healthify_ids.healthify_id`, format `HFY-XXXX-XXXX` using a Crockford-base32-style
  alphabet (excludes ambiguous characters). Never derived from the UUID or any PII.
- **OTP storage (§10):** only a hash of the OTP is ever stored (argon2), never the code
  itself. `attempt_count` + `expires_at` enforce brute-force limits at the DB level in
  addition to Redis-backed rate limiting on the endpoint.
- **Audit log immutability (§55):** `audit_logs` is append-only — the DB role the API uses
  has `INSERT`/`SELECT` only on this table, no `UPDATE`/`DELETE`. `row_hash` chains from
  `prev_hash` so tampering is detectable even by someone with raw DB access.
- **Soft delete:** `users.deleted_at` — account deletion (§92) marks rather than hard-deletes
  immediately, per the grace-period requirement; hard deletion/anonymization is a Phase-later
  job once retention policy (§128) is defined.

Later phases add `roles`/`permissions` (RBAC/ABAC, §49), `lab_reports`/`lab_results`/... (Phase
2), `sharing_sessions`/`consents`/`access_requests` (Phase 4), `doctor_profiles` (Phase 5),
etc. — each as its own migration, never a rewrite of this one.
