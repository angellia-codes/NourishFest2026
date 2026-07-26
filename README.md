# NourishFest 2026 — Event Management App

Event ops tool for planning NourishFest 2026: four monthly pre-events plus the
main festival. React/Vite/TypeScript frontend on Supabase (Postgres + Auth +
Storage). There is no application server — the frontend talks to Postgres
directly, and **access is enforced by row-level security policies in the
database**.

Four nav groups — **Overview** (Dashboard, Committee, Ideas, Event Management),
**Road to NourishFest** (the 4 monthly pre-events), **NourishFest** (main event),
and **Finance** — all built around an `Events` table that every other module
attaches to via `EventID`.

```
NourishFest2026/
├── supabase/
│   ├── schema.sql              ← the entire backend: tables, RLS, triggers, RPCs
│   └── functions/ai-generate/  ← Gemini call for the Ideas suggestion box
├── frontend/                   ← React + Vite + TypeScript app
└── docs/
    ├── core/PRD.md             ← product requirements
    ├── core/DESIGN.md          ← UI/UX visual-design brief
    ├── core/SCHEMA.md          ← STALE: describes the retired Apps Script backend
    └── module/                 ← per-module planning content
```

---

## 1. Backend Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com). Note your **Project
   URL** and **anon key** from Project Settings → API.

2. **SQL Editor → New query.** Paste in all of `supabase/schema.sql` and run it.
   This creates the 16 tables, the RLS policies, the triggers that compute
   derived fields, the `dashboard()`/`finance_dashboard()`/`me()` functions, the
   `attachments` storage bucket, and seeds the `Roles` lookup table.

   `schema.sql` is a **create-from-scratch script, not a migration** — running it
   twice fails on the first `create table`. Once your project is live, make
   changes with incremental `alter table` statements and mirror them back into
   the file.

3. **Add yourself to `Committee` — the app does not work until you do.** RLS
   derives every permission from this table, so while it is empty *everyone*
   resolves to `none` and the app signs you in to blank screens. In the SQL
   Editor:

   ```sql
   insert into "Committee" ("Name", "Email", "Department", "Role", "Status")
   values ('Your Name', 'you@example.com', 'Committee', 'Chairperson', 'Active');
   ```

   Use the email of the Google account you'll sign in with. Don't set
   `Responsibility` — a trigger fills it from `Roles`.

4. **Authentication → Providers → Google.** Enable it and paste in a Google
   OAuth client ID and secret ([Google Cloud
   Console](https://console.cloud.google.com/apis/credentials) → Credentials →
   OAuth client ID → Web application). Supabase shows the callback URL to add as
   an *Authorized redirect URI* on the Google side.

5. **Authentication → URL Configuration.** Add `http://localhost:5173` for local
   development, plus your production URL once you have one. Sign-in silently
   fails to redirect back without this.

6. *(Optional — only for the Ideas AI suggestions box.)* Deploy the Edge
   Function and give it a [Gemini API key](https://aistudio.google.com/apikey):

   ```bash
   supabase functions deploy ai-generate
   supabase secrets set GEMINI_API_KEY=<your key>
   ```

   Everything else works without this; the box is Admin-only and fails with a
   visible error if the key is missing.

7. **Add the rest of your committee** — insert rows in the Supabase table editor
   (`Name | Email | Department | Role | Status`). Two things fail *silently*
   here, and they are the usual cause of "I'm signed in but everything is empty":

   - **`Role` must exactly match** a `RoleName` from the `Roles` table.
     `Chairperson`, `Vice Chairperson`, `Treasurer`, and `Secretary` become
     Admin; `Advisor` becomes Advisor; anything else — **including a typo** —
     becomes Member.
   - **`Status` must be exactly `Active`**, or they are treated as not a member
     at all.

   There is no admin UI for this. The `Committee` table *is* the access-control
   store.

8. **Create your events.** Sign in, go to **Event Management** (Overview,
   Admin-only) and create the 4 pre-event months plus the main event. Nearly
   every other table hangs off `EventID`, so the rest of the app has nothing to
   show until these exist.

## 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env      # paste in your Supabase URL + anon key
npm run dev
```

The anon key is a public client key, not a secret — it ships to the browser by
design. What it can reach is decided entirely by the RLS policies in
`schema.sql`.

### About the UI components

`src/components/ui/` contains hand-rolled Button/Input/Select/Modal/Badge
primitives styled to match shadcn/ui conventions (same prop shapes, Tailwind +
`class-variance-authority`). To use the **actual** shadcn/ui library instead:

```bash
npx shadcn@latest init
npx shadcn@latest add button input select dialog badge textarea tabs
```

Then swap the imports — the prop interfaces are close enough that this is a
find-and-replace, not a rewrite.

### Design direction

"Tropical night market" — deep ink sidebar with a mango→guava→purple festival
gradient for active states, warm paper background for data-dense areas,
`Fraunces` for headers (organic/editorial, ties to "Nourish"), `Plus Jakarta
Sans` for UI/table text. No dark mode. Tokens live in `tailwind.config.js` /
`src/index.css`.

### Responsive

Designed at desktop width, works down to a 390px phone. One breakpoint does the
work — Tailwind's `lg` (1024px): below it the sidebar is an overlay drawer that
starts closed and dismisses on backdrop tap or nav selection; at `lg` and up it's
a static column that starts open. Rotating a tablet across that boundary re-syncs
it. Field rows stack below `sm`, and wide tables scroll inside their own container
so the page body never scrolls horizontally.

---

## 3. Architecture Notes

- **One generic entity API.** `src/services/api.ts` exposes `me / list /
  dashboard / financeDashboard / create / update / remove / uploadFile /
  aiGenerate`, parametrized by entity name, and is the only file that knows
  Supabase exists — 8 files import it. The frontend mirrors it with one
  `useEntityData<T>(entity, { eventId })` hook used by every module.

- **Config-driven CRUD table.** The Venue/Decoration/Souvenir comparisons,
  Entertainment, Awards, Door Prize, Nourish Got Talent, Rundown and Finance
  Income screens are all one `<EntityCrudTable entity="..." fields={[...]} />`
  (`src/components/shared/EntityCrudTable.tsx`) rather than 9 near-duplicate
  components. Reach for it before writing a new table-shaped screen.

- **Events drive everything.** The 4 pre-events are picked from a header
  dropdown (`<PreEventPicker>`, shown only on pre-event screens); the main event
  auto-resolves since there is exactly one row.
  `src/context/SelectedEventContext.tsx` holds this.

- **Permissions are enforced in the database.** `current_permission()` reads the
  signed-in user's email from their JWT, matches it against `Committee`, and
  returns Admin/Advisor/Member/none; RLS policies on every table consult it. The
  frontend's `PermissionContext` fetches the same value once via `me()` and uses
  it to gate buttons — but that is **UX only**. A hidden button is not the
  security boundary; the policy is. `Ideas` and `Checklist` have a fourth
  `'special'` level with bespoke rules (submit your own; update only your own
  assigned task's Status/Remark), which those screens check directly.

- **Derived fields are computed by Postgres, not the client.**
  `TotalEstimationCost` (Quantity × Price) and `BudgetBreakdown.Variance` are
  generated columns; `Committee.Responsibility` is filled by a trigger; the
  one-idea-per-scope cap is a unique constraint. None of these can be bypassed
  by a client that sends its own value.

- **Polling**: TanStack Query refetches every 30s (`POLL_INTERVAL_MS` in
  `useEntityData.ts`) plus on window focus. No offline queueing — a write while
  offline fails with a visible error.

- **File uploads** go to the public `attachments` storage bucket via
  `<FileUploadField>` (`src/components/shared/FileUploadField.tsx`), and the
  returned URL is stored directly on the record's `*FileLink`/`*ImageLink`
  field. No vault screen, no metadata table, no file-type categorization.

## 4. What's fully built vs. follow-the-pattern

Fully implemented: Dashboard, Committee, Ideas (Scope-based submission with a
one-per-scope cap), Event Management (Admin) + per-event Event Details, Budget
(event-scoped, server-computed Variance, Approved-gated Actual Cost/Payment
fields), Participants, Checklist (kanban, own-task-only editing for Members),
Venue/Decoration/Souvenir Comparison, Entertainment, Awards, Door Prize, Nourish
Got Talent, Rundown, and Finance (Dashboard/Income/Expense).

For a new screen over a near-identical entity, follow the `EntityCrudTable`
pattern — a field-config array, no new component. For anything with real
business logic, follow an existing bespoke screen like `Budget.tsx` or
`Checklist.tsx`.

## 5. Known gaps to decide on next

- **Event deletion doesn't cascade.** Only `Participants` is cleaned up (its
  primary key is a foreign key to `Events`). `BudgetBreakdown`, `Checklist`,
  `Rundown` and the comparison tables store `EventID` as plain text with no
  constraint, so deleting an event orphans their rows. The UI warns; nothing
  enforces it.
- **No file-size or file-type limit** on uploads, client- or server-side.
- **No in-app admin UI** for `Committee`/`Roles` beyond the Committee grid —
  roles are assigned by editing the table directly.
- **No generated database types.** `api.ts` casts insert/update payloads with
  `as never` as a result; running `supabase gen types typescript` would let
  those go.
- **No test suite**, for either the frontend or the SQL. `npm run lint`
  currently fails too — ESLint 9 wants an `eslint.config.js` and the repo still
  has the older format.
- `docs/core/SCHEMA.md` describes the retired Apps Script backend and has not
  been rewritten; `supabase/schema.sql` is the source of truth (tracked in
  `TODO.md`).
