# Healthify — Web

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
- **Dashboard** — Healthify ID, health overview, recent reports, quick
  actions (`app/(app)/dashboard`)
- **Reports** — upload, async processing status, structured results with
  deterministic clinical status + trends (`app/(app)/reports/*`) — **mock**,
  see below
- **Timeline** — chronological health events (`app/(app)/timeline`) — mock

Nav items for features not yet built (Health category pages, Medicines,
Permissions, Ask Healthify) are visible but disabled with a "Soon" badge —
see `components/layout/nav-items.ts` — rather than linking to dead pages.

### Two servers now — this needs apps/api running

Auth and Sharing call a real backend at `NEXT_PUBLIC_API_BASE_URL`
(defaults to `http://localhost:8000/api/v1`). Start `apps/api` first — see
its README — or nothing past the landing page will work.

**Reports and Timeline are still mock-only.** `apps/api` has no
report/OCR pipeline (that's Phase 2 — docs/ROADMAP.md). Those two screens
run against `MockReportsProvider` (`lib/mock/mock-reports-provider.ts`),
an in-browser fake with synthetic data in `localStorage`. It's the
sharing feature's honest boundary too: a share only grants access at the
**health-category** level, because there's no real report content on the
backend yet to serve once granted (`ShareCategoriesResponse.dataNote`
says so explicitly rather than the UI/API fabricating placeholder data).

`lib/mock/mock-auth-provider.ts` still exists for offline frontend-only
preview (no backend needed, any code works) — swap the import in
`lib/auth/get-provider.ts` back to it if you want that instead.

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
4. You land on the dashboard with a real Healthify ID and an empty profile
   (nothing pre-seeded — this account is really persisted in `apps/api`'s
   SQLite/Postgres DB)
5. Reports/Timeline still work exactly as before — synthetic, client-side,
   unrelated to the real backend

### Try sharing (the new part)

1. Go to **Share** → pick a category (e.g. Blood) → enter a *second*
   identifier as the recipient (e.g. `doctor@example.com` — must differ
   from your own login identifier) → pick a duration → **Generate secure
   link**
2. Copy the link (`/s/<token>`) — Healthify can't show it to you again
3. Open that link **in a private/incognito window** (so it doesn't share
   your patient cookies) — you'll see your Healthify ID and a prompt for
   the recipient's identifier
4. Enter the *same* identifier you shared with (a different one is
   rejected — that's the "who" access control working) → check the
   **apps/api terminal** again for this second OTP code → verify
5. You'll see the granted category as "Available" and every other
   category as "Locked" with a **Request access** button
6. Request access to a locked category with a reason → back in your
   patient window, **Share** → **Pending requests** → approve or decline
   → refresh the recipient tab to see the result
7. Back in the patient window, **Revoke access** on the share — the
   recipient tab immediately loses access on its next request, even
   though its token hasn't expired

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
components/sharing/   CreateShareForm, ActiveShares, PendingRequests, CategoryPicker
components/sharing/recipient/  RecipientFlow, IdentifyStep, OtpStep, CategoriesStep, RequestAccessForm
lib/api/               fetch client (with refresh-on-401 retry), API types, auth/profile/sharing request shapes
lib/auth/               AuthProvider interface, SessionProvider/useSession, http-auth-provider (real, default)
lib/sharing/            React Query hooks for the patient-side sharing API
lib/health/             status-engine (pure, tested), category metadata
lib/reports/            ReportsProvider interface + React Query hooks
lib/mock/               MockAuthProvider (unused by default) + MockReportsProvider + synthetic test catalog
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
- **Sharing grants categories, not report content.** There's no backend
  report store yet (Phase 2), so "access" is a real, enforced permission
  grant with nothing to leak — not a UI mockup of data sharing. The
  recipient view says this plainly instead of inventing placeholder data.
- **Clinical status is arithmetic, not AI.** `computeClinicalStatus` in
  `lib/health/status-engine.ts` is a pure function over the reference
  range printed on the report — no LLM in the loop (§29/§30/§139).
- **Visual design.** Warm ivory background instead of clinical gray, a
  deep teal brand color with a muted gold accent, Fraunces/Geist pairing
  (serif for headings/numbers, clean sans for UI chrome). Tokens live in
  `app/globals.css`; status colors (§29/§84) are always paired with text
  and an icon, never color alone.
