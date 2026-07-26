# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Doc status

The layout is just `ls`; which docs are trustworthy is not:

- `supabase/schema.sql` — the backend. **The source of truth for entities, columns, and permissions.**
- `docs/core/PRD.md` — product requirements. Untracked, current on product intent.
- `docs/core/DESIGN.md` — UI/UX visual-design brief. Current.
- `docs/core/SCHEMA.md` — sheet/column reference from the Apps Script era. **Stale.**
- `README.md` — **Stale and actively misleading**: it is still a step-by-step Apps Script
  setup guide for a `Code.gs` that no longer exists in the tree. Its architecture notes
  (§3) are still accurate; its setup instructions (§1–2) are not.
- `TODO.md` — follow-ups list, also written pre-migration; its "no concurrency locking"
  item is resolved (Postgres handles it), the rest still stand.

React SPA on Supabase (Postgres + Auth + Storage + one Edge Function). There is no
application server: the frontend talks to Postgres directly through PostgREST, and
**permissions are enforced by RLS policies in the database**, not by application code.

## Everything hangs off `Events`

Almost every table carries an `EventID`, and the app is organised around four nav groups —
Overview, Road to NourishFest (4 monthly pre-events), NourishFest (the main event), and
Finance.

**A fresh database shows empty screens until `Events` rows exist.** The expected shape is
4 `EventType = 'PreEvent'` rows plus exactly 1 `'MainEvent'`, created via Event Management
(Admin-only) — this is the second bootstrap step after seeding yourself into `Committee`,
and neither is discoverable from the UI.

Which event a screen reads is resolved by `SelectedEventContext`, not passed down as
props: pre-event screens follow a header dropdown (`<PreEventPicker>`, defaulting to the
earliest by `Date`), while the main event auto-resolves because there is exactly one row.
Screens call `useSelectedEvent()` and pass the id into `useEntityData(entity, { eventId })`.

**`Committee` misconfiguration fails silently, in two ways.** A `Role` that isn't one of
`Chairperson`/`Vice Chairperson`/`Treasurer`/`Secretary`/`Advisor` doesn't error — it
resolves to `Member`, so a typo quietly demotes someone. And `Status` must be exactly
`Active`, or they aren't treated as a member at all. Both are the usual cause of "I'm
signed in but everything is empty or read-only."

## Commands

All commands run from `frontend/` — the standard npm scripts (`dev`, `build`, `preview`,
`lint`); see `frontend/package.json`. There is no test suite.

`npm run lint` currently fails: ESLint 9 wants an `eslint.config.js` and the repo only
has the older config format. Pre-existing, unrelated to the backend.

`frontend/.env` (copy from `.env.example`) needs `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. The anon key is a public client key — it is not a secret, and
what it can reach is decided entirely by RLS.

Backend changes are SQL, applied in the Supabase dashboard's SQL editor. `schema.sql` is
a **create-from-scratch** script, not a migration — running it twice fails on the first
`create table`. Write incremental `alter table` / `create or replace function` statements
for changes to a live project, and mirror them back into `schema.sql`.

The Edge Function deploys separately: `supabase functions deploy ai-generate`.

## Backend design (`supabase/schema.sql`)

16 tables, one per entity. **Columns keep their original PascalCase names** (`EventID`,
`TotalEstimationCost`) so `frontend/src/types/index.ts` maps 1:1 with no remapping layer.
Postgres folds unquoted identifiers to lowercase, so **every identifier in the SQL is
double-quoted** — miss a quote when adding a column and PostgREST returns it lowercased,
and the frontend silently reads `undefined`.

- **Auth**: Supabase Auth with the Google provider. `current_email()` reads the JWT;
  `current_permission()` matches it against `Committee.Email` where `Status = 'Active'`
  and derives `Admin` / `Advisor` / `Member` / `none` from `Role`. Both are
  `security definer` — required, or the RLS policies that call them recurse when they
  read `Committee`.
- **`Committee` is the access-control table.** While it is empty, `current_permission()`
  returns `'none'` for everyone including you, and the app signs in to blank screens.
  Seeding the first admin row is a manual step, documented at the bottom of `schema.sql`.
- **Business rules live in the database**, not in the client, so they cannot be bypassed:
  `TotalEstimationCost` (5 tables) and `BudgetBreakdown.Variance` are `generated always as`
  columns; `Committee.Responsibility` is filled by a trigger from the `Roles` lookup;
  `Ideas` one-per-user-per-`Scope` is a unique constraint plus a trigger that stamps
  `SubmittedBy`/`Status`/`DateSubmitted`.
- **A Member editing a `Checklist` task** is enforced in two places, because one can't do
  it alone: an RLS policy restricts *which rows* (`Assignee` = their email), and a
  `before update` trigger restricts *which columns* (only `Status`/`Remark`).
- **Dashboards** are the `dashboard()` and `finance_dashboard()` RPCs. Both are
  `security definer`, which bypasses RLS — so each re-checks permission explicitly.
  `finance_dashboard()` throws for Members, matching `Finance_Incoming`'s `'none'`.
- **Free-text date columns**: `Events.Date`, `Checklist.DueDate`, and
  `Finance_Incoming.DateReceived` are `text` (they were sheet cells). Cast them with
  `safe_date()`, never `::date` — one malformed value would otherwise throw for the whole
  query.
- **Uploads** go to the public `attachments` Storage bucket under a randomised path, and
  the returned public URL is stored in the row's `*FileLink`/`*ImageLink` column. There
  is no separate documents table.

## Frontend architecture

See `frontend/CLAUDE.md` — it loads automatically when working under `frontend/`.

The one thing worth knowing from outside that directory: every screen reaches the backend
through `frontend/src/services/api.ts`, and only 8 files import it. Keeping that file's
method surface stable is what let the Apps Script → Supabase migration leave all ~20
module screens untouched. Don't leak Supabase specifics (query builders, realtime
channels) past it.

## Known/deliberate gaps (don't "fix" without asking)

- **Deleting an `Event` orphans its children.** Only `Participants` cascades (its PK is
  the `EventID` FK); `BudgetBreakdown`, `Checklist`, `Rundown` and the comparison tables
  hold `EventID` as plain text with no constraint, so their rows survive and point at
  nothing. The UI warns on delete; nothing enforces it.
- No file-size or file-type limit on uploads, client- or server-side.
- No in-app role-admin UI — roles are assigned by editing `Committee.Role` directly in
  the Supabase table editor.
- No offline queueing — a write while offline fails visibly rather than retrying.
- No rate limiting or usage logging on AI generation calls.
- Uploaded PDFs are not parsed/OCR'd — cost fields are entered by hand after a human reads
  the attached document.
- No generated Database types. `api.ts` casts insert/update payloads with `as never`
  because of it; running `supabase gen types` would remove the casts.
- No test suite, for either the frontend or the SQL.
