# Healthy

Patient health vault — OTP auth, health profile, patient-controlled
sharing (including a doctor portal), lab report upload/processing, health
categories, trends, timeline, search, and prescriptions/medicines. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design,
[`apps/api/README.md`](apps/api/README.md) for backend details, and
[`apps/web/README.md`](apps/web/README.md) for frontend details.

## What's real vs. simplified for local dev

Reports and prescriptions go through a genuine pipeline — upload →
malware scan → text extraction → deterministic parsing → normalization/
categorization → status — all backed by real code, not canned responses.
Two pieces are intentionally simplified because this sandbox has no
package manager and no network access to a paid vendor API:

- **Virus scanning** (`app/providers/virus_scan_provider.py`) is a
  clearly-labeled mock — no ClamAV engine is installed. It still rejects
  the real EICAR antivirus test file, so the reject path is exercised for
  real, not faked.
- **OCR** (`app/providers/ocr_provider.py`) does real text extraction for
  PDF/TXT/CSV (via `pypdf`). Scanned images and image-only PDFs have no
  text layer to read without an OCR engine like Tesseract, which isn't
  installable here — those uploads fail cleanly with an honest message
  instead of a faked result.

Both sit behind swappable provider interfaces (same pattern as
`OTP_PROVIDER=mock`), so wiring in ClamAV/Tesseract/a cloud OCR API later
is a config change, not a rewrite.

## Run locally (no Docker required)

Two servers, two terminals. Start the API first — the web app calls it
directly.

### 1. Backend (`apps/api`) — terminal 1

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env   # or hand-write one, see apps/api/README.md for SQLite defaults
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`. Docs at
http://localhost:8000/docs.

### 2. Frontend (`apps/web`) — terminal 2

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000.

## Getting an OTP in local dev

`OTP_PROVIDER=mock` — no real SMS/email is sent. Every code goes to two
places:

- The `apps/api` terminal: `MOCK OTP for <identifier>: <code>`
- `apps/api/otp_log.txt` — every OTP ever issued, one per line
  (`timestamp<TAB>identifier<TAB>code`), append-only, gitignored. Handy
  for testing without scrolling terminal history:

  ```bash
  tail -f apps/api/otp_log.txt
  ```

Use any phone number or email as the identifier — it doesn't need to be
real.

## Production hosting with real SMS

Netlify can host `apps/web`, but it does not run this FastAPI service. A
simple free-tier arrangement is:

- **Frontend:** Netlify, with `NEXT_PUBLIC_API_BASE_URL` set to the public API URL.
- **API:** Render or Railway, using the `apps/api/Dockerfile` and port `8000`.
- **Database:** Neon or Supabase Postgres; set `DATABASE_URL` to its async URL.
- **SMS:** Twilio; set `OTP_PROVIDER=twilio` and the three `TWILIO_*` secrets.
- **Files:** S3-compatible storage such as Cloudflare R2; configure the existing
  `STORAGE_*` variables instead of using local disk.

Set `ENVIRONMENT=production`, strong `JWT_SIGNING_KEY` and
`FIELD_ENCRYPTION_KEY`, `CORS_ALLOW_ORIGINS` to the Netlify URL, and
`SHARE_LINK_BASE_URL` to the Netlify URL. Run `alembic upgrade head` once
against the hosted database before opening the site. Free hosting may sleep;
Twilio itself is not permanently free, and trial accounts restrict recipients.

## Verifying a doctor account in local dev

There's no admin console yet, so doctor verification (§131) is a real
operator-run script rather than a UI or self-serve API call — see
[`apps/api/README.md`](apps/api/README.md) for the exact steps:

```bash
cd apps/api && python3 scripts/verify_doctor.py <the doctor's login identifier>
```

## Stopping the servers

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill   # web
lsof -ti:8000 -sTCP:LISTEN | xargs -r kill   # api
```
cd /Users/sairahul/projects/healthy/apps/api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000


cd /Users/sairahul/projects/healthy/apps/web
npm run dev

curl http://localhost:8000/health   # {"status":"ok"}
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200

lsof -ti:8000 -sTCP:LISTEN | xargs -r kill   # api
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill   # web
