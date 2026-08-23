# Healthy — Web

Patient-facing frontend. Next.js (App Router, TypeScript strict), Tailwind
CSS v4, TanStack Query, React Hook Form + Zod. See
[`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for how this fits the
rest of the platform, and [`apps/api/README.md`](../api/README.md) for the
backend this now talks to for real.

## Scope of this build

- **Auth** — OTP registration/login, session context, route protection
  (`app/(auth)/*`, `lib/auth/`, `proxy.ts`) — **real backend** (`apps/api`)
- **Profile** — view/edit health profile (`app/(app)/profile`) — real backend
- **Sharing** — patient creates category-scoped share links; OTP-verified
  recipient view at `/s/[token]`; access requests; approve/decline; revoke
  (`app/(app)/share`, `app/s/[token]`, §42-57) — real backend
- **Dashboard** — Healthy ID, health overview, recent reports, quick
  actions (`app/(app)/dashboard`) — real backend
- **Reports** — upload, async processing status, structured results with
  deterministic clinical status + trends (`app/(app)/reports/*`) — real
  backend
- **Timeline** — chronological health events (`app/(app)/timeline`) — real backend
- **Health** — category browsing with latest results + trend charts
  (`app/(app)/health/*`) — real backend
- **Search** — cross-report/result search (`app/(app)/search`) — real backend
- **Doctor portal** — register as a doctor, see patients who've shared
  with your verified identifier, view authorized results
  (`app/(app)/doctor/*`, linked from Profile, §40/§41) — real backend
- **Medicines & prescriptions** — manual medicine CRUD, prescription
  upload with OCR-extracted items and a correction workflow
  (`app/(app)/medicines/*`, §38/§39) — real backend

Nav items for features not yet built (Permissions, Ask Healthy) are
visible but disabled with a "Soon" badge — see
`components/layout/nav-items.ts` — rather than linking to dead pages.

### Two servers — this needs apps/api running

Every screen above calls a real backend at `NEXT_PUBLIC_API_BASE_URL`
(defaults to `http://localhost:8000/api/v1`). Start `apps/api` first — see
its README — or nothing past the landing page will work.

Report/prescription uploads go through a real pipeline (malware scan →
text extraction → deterministic parsing → normalization/categorization →
status), with two provider-abstracted simplifications documented in the
root [`README.md`](../../README.md#whats-real-vs-simplified-for-local-dev)
— no OCR for scanned images, and a mocked (not absent) virus scanner. A
granted share category now serves the patient's real extracted results in
it — not just a boolean "authorized" flag — for both the public recipient
flow (`/s/[token]`) and a verified doctor's own dashboard (`/doctor`);
both re-check the grant server-side on every request (§67).

`lib/mock/mock-auth-provider.ts` and `lib/mock/mock-reports-provider.ts`
still exist for offline frontend-only preview (no backend needed, any
code works) — swap the imports in `lib/auth/get-provider.ts` /
`lib/reports/get-provider.ts` back to them if you want that instead.

## Getting started

```bash
# 1. Start apps/api first (see apps/api/README.md) — needs to be on :8000
# 2. Then:
cp .env.example .env.local   # only needed if your API isn't on localhost:8000
npm install
npm run dev
```

Open http://localhost:3000 — see "Try it" below.

## Try it

**Auth is real now** — the OTP code is NOT shown in the browser. It's
logged to the **apps/api terminal**: `MOCK OTP for <identifier>: <code>`.

1. Start `apps/api` (`uvicorn app.main:app --reload --port 8000`) and this
   app (`npm run dev`)
2. **Create your vault** → enter any phone/email → **Send one-time code**
3. Check the **apps/api terminal** for the code, enter it here
4. You land on the dashboard with a real Healthy ID and an empty profile
   (nothing pre-seeded — this account is really persisted in `apps/api`'s
   SQLite/Postgres DB)
5. **Upload** → pick a text-based PDF, TXT, or CSV lab report (scanned
   images aren't OCR'd in this environment — see the root README). Watch
   it move through UPLOADED → SCANNING → ... → COMPLETED automatically,
   then see real extracted results, statuses, and trends
6. **Health** and **Search** browse and find those results by category or
   free text; **Timeline** shows the upload as a real event

### Try sharing (the new part)

1. Go to **Share** → pick a category (e.g. Blood) → enter a *second*
   identifier as the recipient (e.g. `doctor@example.com` — must differ
   from your own login identifier) → pick a duration → **Generate secure
   link**
2. Copy the link (`/s/<token>`) — Healthy can't show it to you again
3. Open that link **in a private/incognito window** (so it doesn't share
   your patient cookies) — you'll see your Healthy ID and a prompt for
   the recipient's identifier
4. Enter the *same* identifier you shared with (a different one is
   rejected — that's the "who" access control working) → check the
   **apps/api terminal** again for this second OTP code → verify
5. You'll see the granted category as "Available" — with the real
   extracted results shown inline now — and every other category as
   "Locked" with a **Request access** button
6. Request access to a locked category with a reason → back in your
   patient window, **Share** → **Pending requests** → approve or decline
   → refresh the recipient tab to see the result
7. Back in the patient window, **Revoke access** on the share — the
   recipient tab immediately loses access on its next request, even
   though its token hasn't expired

### Try the doctor portal

1. Register a *second* account as the doctor (log out, register a new
   identifier)
2. Go to **Profile** → **Doctor dashboard** → fill in the registration
   form (any values work locally)
3. From a terminal: `apps/api$ python3 scripts/verify_doctor.py <the
   doctor identifier you just used>` — this is a real manual operator
   step (§131), not something the UI itself can do
4. Back in the app, refresh `/doctor` — still empty (no patient has
   shared with this identifier yet)
5. Log back in as your original patient account, share a category with
   the doctor's identifier (same **Share** flow as above), then complete
   the recipient OTP flow once at `/s/<token>` using the doctor's
   identifier — this is what links the share to the doctor's account
6. Log back in as the doctor → `/doctor` now lists that patient →
   open it to see the same authorized/locked category view, with results

### Try prescriptions & medicines

1. Go to **Medicines** → **Add a medicine** for a quick manual entry
2. **Upload prescription** with a text-based file listing lines like
   `Paracetamol 500mg - 1-0-1 - 5 days` → once processed, open it to see
   extracted items, each with a **Correct** action that preserves the
   original extracted value alongside your correction (§96/§143)

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also runs the TS compiler) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest — currently covers the deterministic clinical status engine (`lib/health/status-engine.ts`), the one piece of logic the spec explicitly forbids delegating to an LLM (§30/§139) |

## Structure

```
app/(auth)/           register, login, verify — unauthenticated
app/(app)/            dashboard, reports, timeline, profile, share — behind proxy.ts
app/s/[token]/        recipient-facing share view — public, no patient session
components/ui/        design-system primitives (Button, Field, Card, StatusBadge, OtpInput, Avatar, loading/empty/error states)
components/layout/    Sidebar, Topbar, AppShell, Logo, nav config
components/auth/      IdentifierForm, OtpForm
components/dashboard/ IdentityCard, QuickActions, DataCompleteness
components/reports/   ReportCard, ReportDetail, ResultRow, UploadDropzone, ProcessingStatus
components/timeline/  TimelineItem
components/health/    CategoryDetail, TrendChart
components/sharing/   CreateShareForm, ActiveShares, PendingRequests, CategoryPicker
components/sharing/recipient/  RecipientFlow, IdentifyStep, OtpStep, CategoriesStep, RequestAccessForm
components/doctor/    DoctorRegisterForm, DoctorDashboard, PatientCategoriesView
components/prescriptions/  PrescriptionUpload, PrescriptionList, PrescriptionDetail, PrescriptionItemRow
components/medicines/ AddMedicineForm, MedicineList
lib/api/               fetch client (apiFetch + apiUpload, refresh-on-401 retry), API types, request shapes per feature
lib/auth/               AuthProvider interface, SessionProvider/useSession, http-auth-provider (real, default)
lib/sharing/            React Query hooks for the patient-side sharing API
lib/health/             status-engine (pure, tested), category metadata, React Query hooks for categories/trends
lib/reports/            ReportsProvider interface, http-reports-provider (real, default) + React Query hooks
lib/search/             React Query hook for cross-report/result search
lib/doctor/             React Query hooks for doctor profile/patients
lib/prescriptions/      React Query hooks for prescription upload/items/correction
lib/medicines/          React Query hooks for medicine CRUD
lib/mock/               MockAuthProvider + MockReportsProvider (both unused by default) + synthetic test catalog
lib/validation/         Zod schemas
```

## Notable decisions

- **No tokens in `localStorage`.** `lib/api/client.ts` never reads or
  stores a patient token; sessions are httpOnly/Secure cookies attached
  via `credentials: "include"` (§106). A **recipient's** share-access
  token (`/s/[token]` flow) is a different, lower-trust, short-lived
  credential by design (§43) — it's passed explicitly as a Bearer header,
  held only in React state for that tab, and never persisted.
- **`apiFetch` retries once on 401.** The access-token cookie is
  short-lived (15 min); a 401 transparently triggers `/auth/refresh` and
  replays the original request, so a session doesn't silently die
  mid-use. Recipient share calls (`/share/...`) are excluded — a 401
  there means "verify again," not "refresh a cookie that doesn't exist."
- **`proxy.ts`** (Next.js 16's `middleware.ts` replacement) redirects
  based on cookie *presence* only — a UX nicety, not an authorization
  boundary. Real authorization is always the API's job (§67 zero-trust
  frontend rule): every sharing endpoint re-checks ownership/expiry/
  revocation server-side regardless of what the frontend assumed.
- **Doctor accounts are the same accounts as patients.** Registering a
  doctor profile layers on top of the existing OTP-auth account rather
  than a separate login system — one person's account can carry both a
  health profile and a doctor profile, and having one grants nothing
  toward the other (§132): a doctor still only sees a specific patient's
  data after that patient explicitly shares a category with them.
- **Clinical status is arithmetic, not AI.** `computeClinicalStatus` in
  `lib/health/status-engine.ts` is a pure function over the reference
  range printed on the report — no LLM in the loop (§29/§30/§139).
- **Visual design.** Warm ivory background instead of clinical gray, a
  deep teal brand color with a muted gold accent, Fraunces/Geist pairing
  (serif for headings/numbers, clean sans for UI chrome). Tokens live in
  `app/globals.css`; status colors (§29/§84) are always paired with text
  and an icon, never color alone.
