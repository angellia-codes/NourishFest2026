# NourishFest 2026 — Event Management App

Full-stack event ops tool: React/Vite/TS frontend + Google Apps Script backend
over a Google Sheet. Four top-level nav groups — **Overview** (Dashboard,
Committee, Ideas, Event Management), **Road to NourishFest** (Pre-Event, 4
monthly events), **NourishFest** (Main Event), and **Finance** — all built
around an `Events` entity that every other module attaches to via `EventID`.

```
NourishFest2026/
├── Code.gs             ← entire backend, paste into the Apps Script editor
├── docs/
│   ├── core/
│   │   ├── PRD.md        ← product requirements this build follows
│   │   ├── SCHEMA.md      ← stale — describes an earlier backend design
│   │   └── DESIGN.md      ← UI/UX visual-design brief
│   └── module/            ← per-module planning content
└── frontend/             ← React + Vite + TypeScript app
```

---

## 1. Backend Setup (Google Apps Script)

1. Create a new Google Sheet (this becomes your database).
2. Extensions → Apps Script. Delete the default content and paste in
   `Code.gs`.
3. In the function dropdown at the top, select `setupSheets`, click **Run**.
   Grant the permissions it asks for. This creates all 16 tabs with header
   rows, seeds the `Roles` lookup tab, and adds *you* as a `Chairperson` row
   in `Committee` — check that sheet to confirm you're there with
   `Status = Active`. Safe to re-run later (it never touches a tab that
   already exists).
4. Set `DRIVE_FOLDER_ID` near the top of `Code.gs` to a Drive folder you
   own — this is where every uploaded file (quotations, invoices, design
   images, receipts) lands. There's no separate Documents vault or metadata
   table; the single `uploadFile` action just returns a view-link URL that
   gets stored directly on whichever record's `*FileLink`/`*ImageLink` field
   triggered the upload.
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone within [your Workspace domain]**
   - Copy the deployment URL (ends in `/exec`) — this is `VITE_GAS_API_URL`.
6. Every code change needs a new deployment version (**Deploy → Manage
   deployments → Edit → New version**) to go live.
7. Add the rest of your committee: add rows to the `Committee` tab manually
   — `Name | Email | Department | Role | Status`. `Role` must exactly match
   one of the `Roles` tab's `RoleName` values (`Chairperson`, `Vice
   Chairperson`, `Treasurer`, `Secretary`, `Advisor`, or one of the 6
   coordinator roles) — permission level is *derived* from this value every
   request (`Chairperson`/`Vice Chairperson`/`Treasurer`/`Secretary` →
   Admin, `Advisor` → Advisor, anything else → Member), so a typo here
   silently drops someone to Member. `Status` must be exactly `Active` or
   they're treated as not a member at all. There's no separate Permissions
   sheet or admin UI — the `Committee` tab *is* the RBAC store.
8. Once signed in, go to **Event Management** (Overview group, Admin-only)
   and create your 4 Pre-Event months plus the Main Event — nothing else in
   the app has data to show until these exist.

## 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env      # paste your /exec URL into VITE_GAS_API_URL
npm run dev
```

### About the UI components
`src/components/ui/` contains hand-rolled Button/Input/Select/Modal/Badge
primitives styled to match shadcn/ui conventions (same prop shapes, Tailwind
+ `class-variance-authority` ready). To use the **actual** shadcn/ui
component library instead:
```bash
npx shadcn@latest init
npx shadcn@latest add button input select dialog badge textarea tabs
```
Then swap the imports in the module components — the prop interfaces are
close enough that this is a find-and-replace, not a rewrite.

### Design direction
"Tropical night market" — deep ink sidebar with a mango→guava→purple
festival gradient for active states, warm paper background for data-dense
areas, `Fraunces` for headers (organic/editorial, ties to "Nourish"),
`Plus Jakarta Sans` for UI/table text (legible at small sizes). Desktop-first,
no dark mode. Adjust tokens in `tailwind.config.js` / `src/index.css`.

---

## 3. Architecture Notes

- **One generic entity API.** `Code.gs` exposes
  `me / list / dashboard / financeDashboard / create / update / delete /
  vote / uploadFile`, parametrized by an `entity` name (16 sheet tabs).
  Frontend mirrors this with one `useEntityData<T>(entity, { eventId })`
  hook used by every module — see `src/hooks/useEntityData.ts`.
- **Config-driven CRUD table.** `VenueComparison`, `DecorationComparison`,
  `SouvenirComparison`, `Entertainment`, `Awards`, `DoorPrize`, `Rundown`,
  and `Finance_Incoming` are all backed by one
  `<EntityCrudTable entity="..." fields={[...]} />` component
  (`src/components/shared/EntityCrudTable.tsx`) instead of 8 near-duplicate
  screens.
- **Events drive everything.** Pre-Event's 4 monthly events are picked via
  a header dropdown (`<PreEventPicker>`, only shown while a Pre-Event screen
  is active); the Main Event auto-resolves since there's exactly one row.
  `src/context/SelectedEventContext.tsx` holds this state.
- **Permissions** are derived server-side from the signed-in user's
  `Committee.Role` (no separate Permissions sheet) — one of three tiers,
  Admin/Advisor/Member, fetched once via the `me` action and held in
  `PermissionContext`. `usePermissions().canWrite('BudgetBreakdown')` gates
  buttons/edit affordances; a few entities (`Ideas`, `Checklist`) have a
  fourth `'special'` access level with bespoke rules (submit+vote only;
  update your own assigned task only) checked directly in those screens.
  The backend independently re-checks every write — a hidden button is UX
  only, not the real security boundary.
- **Polling**: TanStack Query refetches every 30s (`POLL_INTERVAL_MS` in
  `useEntityData.ts`) plus on window focus. No offline queueing — a write
  while offline just fails with a visible error.
- **File uploads** go through one `uploadFile` action (base64 in, Drive
  view-link URL out) wired into per-field `<FileUploadField>` controls
  (`src/components/shared/FileUploadField.tsx`) — there's no vault screen,
  no metadata row, no file-type categorization.

## 4. What's fully built vs. follow-the-pattern

Fully implemented: Dashboard, Committee, Ideas (Scope-based submission with
a one-per-scope cap, real per-user voting), Event Management (Admin) +
per-event Event Details, Budget (event-scoped, server-computed Variance,
Approved-gated Actual Cost/Payment fields), Participants (aggregate
counts per event), Checklist (kanban, own-task-only editing for Members),
Venue/Decoration/Souvenir Comparison, Entertainment, Awards, Door Prize,
Rundown, and the Finance module (Dashboard/Income/Expense).

If you want a new screen for a near-identical entity, follow the
`EntityCrudTable` pattern (a field-config array, no new component); for
anything with real business logic, follow the pattern of an existing
bespoke screen like `Budget.tsx` or `Checklist.tsx`.

## 5. Known gaps to decide on next

- **No concurrency locking** — unlike the previous backend design, writes
  in the current `Code.gs` don't use `LockService`, so two organizers
  editing the same row at the same moment could race. Fine at small-team
  volume; say the word if you want it added back.
- **No file-size or file-type limit** on `uploadFile` — the previous
  Documents vault enforced a 10MB/PDF-only cap client- and server-side;
  the current single upload action has neither. Tell me if you want limits
  reinstated.
- **No in-app admin UI for `Committee`/`Roles`** beyond the Committee grid
  itself — `Roles` (the responsibility-lookup + informational permission
  tier per role name) is still sheet-only, seeded once by `setupSheets()`.
- **Event deletion has no cascade check** — removing an `Event` in Event
  Management doesn't clean up `Budget`/`Checklist`/etc. rows still
  referencing its `EventID` (the UI warns about this on delete, but nothing
  enforces it).
- `docs/core/SCHEMA.md` still describes an earlier backend design — treat
  `Code.gs`'s own `SCHEMA`/`PERMISSIONS` consts as the source of truth until
  that file is updated (tracked in `TODO.md`).
