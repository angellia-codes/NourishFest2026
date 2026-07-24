# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Backend/frontend are currently out of sync (mid-rewrite)

`Code.gs` was recently rewritten to a new, incompatible API design (see "Backend design"
below) as **uncommitted local changes** (`git diff HEAD -- Code.gs` shows ~300
insertions/450 deletions vs. the last commit). The new design is documented in
`docs/core/PRD.md` (v4, also untracked/new).

The entire `frontend/` app — `services/api.ts`, `types/index.ts`, `hooks/useSheetData.ts`,
`PermissionContext`, every module screen — is still built against the **old** backend
contract (generic `sheet`-based CRUD, a `Permissions` sheet, a `Documents`/Drive vault,
Gemini AI generation). `docs/core/SCHEMA.md` and `README.md` also still describe that old
design; they have not been updated for the rewrite.

**Practically:** don't assume frontend code compiles against what the backend now returns,
and don't "fix" one side to match the other without checking which direction the user
actually wants to go — this is an in-progress pivot, not a bug. If you're asked to wire up
a frontend feature, check `Code.gs`'s actual `SCHEMA`/action list first rather than trusting
`SCHEMA.md`, `README.md`, or the frontend's existing `types/index.ts`.

## Repository layout

```
NourishFest2026/
├── Code.gs             ← entire backend, paste directly into a Google Apps Script project
├── README.md            ← setup instructions — describes the OLD (pre-rewrite) backend design
├── TODO.md              ← known follow-ups / stale-doc cleanup list
├── docs/
│   ├── core/
│   │   ├── PRD.md        ← product requirements for the NEW backend design (untracked, current)
│   │   ├── SCHEMA.md      ← sheet/column reference for the OLD backend design (stale)
│   │   └── DESIGN.md      ← UI/UX visual-design brief (theme, tokens, coding constraints)
│   └── module/            ← per-module content/planning notes (event ideas, committee, budget)
└── frontend/             ← React + Vite + TypeScript app (built against the OLD backend design)
```

This is a Google Apps Script + Google Sheets backend (not Node/Express) paired with a
separately-deployed React SPA. There is no local backend server and no database — `Code.gs`
runs inside the Apps Script sandbox against a Google Sheet acting as the datastore.

## Commands

All commands run from `frontend/`:

```bash
npm install
npm run dev       # Vite dev server
npm run build      # tsc -b && vite build — type-checks then bundles
npm run preview    # preview a production build
npm run lint        # eslint .
```

There is no test suite. There is no build/lint step for `Code.gs` — it is edited locally
then manually copy-pasted into the Apps Script editor (Extensions → Apps Script) and
redeployed (Deploy → Manage deployments → Edit → New version) to take effect. Changes to
`Code.gs` in this repo do **not** auto-deploy; say so if asked to "deploy" a backend change.

`frontend/.env` (copy from `.env.example`) needs the Apps Script `/exec` deployment URL
for the dev server to reach real data (`VITE_GAS_API_URL` per the old `api.ts`; the PRD's
frontend rewrite section calls this `VITE_API_BASE_URL` instead — check which name is
actually read before assuming either).

## Backend design (current `Code.gs`, uncommitted)

One Apps Script Web App (`doGet`/`doPost`) over an `entity`-keyed `SCHEMA` map (16 sheet
tabs — `Events`, `Ideas`, `IdeaVotes`, `Committee`, `Roles`, `BudgetBreakdown`,
`Participants`, `Checklist`, `VenueComparison`, `DecorationComparison`,
`SouvenirComparison`, `Entertainment`, `Awards`, `DoorPrize`, `Rundown`,
`Finance_Incoming` — see `SCHEMA` near the top of `Code.gs`).

- **Actions**: `GET ?action=me|list|dashboard|financeDashboard`, `POST {action:
  'create'|'update'|'delete'|'vote'|'uploadFile', entity, id, data}`. There is no
  `whoami`/`listModules`/generic `get` — those are leftovers in the old frontend `api.ts`
  that no longer have a backend counterpart.
- **Auth**: `getCurrentUser_()` reads `Session.getActiveUser().getEmail()`, matches it
  against the `Committee` sheet's `Email` column (`Status === 'Active'`), and derives a
  `permission` (`Admin` / `Advisor` / `Member` / `none`) from the member's `Role` —
  `ADMIN_ROLES = ['Chairperson', 'Vice Chairperson', 'Treasurer', 'Secretary']`. There is
  no separate `Permissions` sheet in this design — permission is fully derived from
  `Committee.Role` each request, checked per-entity via the `PERMISSIONS` map
  (`'write' | 'read' | 'none' | 'special'`) in `checkAccess_()`.
- **`'special'` access** means custom per-entity logic downstream, not a fixed role level:
  `Ideas` writes go through `createIdea_()` (enforces one idea submission per user per
  `Scope` — see comment above it), and `Checklist` updates for Members go through
  `updateOwnChecklistTask_()` (a Member may only patch `Status`/`Remark` on a task where
  `Assignee === their email`).
- **Business rules to know before touching `createRecord_`/`updateRecord_`**:
  `BudgetBreakdown.Variance` is recomputed server-side (`computeVariance_`) whenever a
  budget row is created/updated, and only populated once `ApprovalStatus === 'Approved'`
  and `ActualCost` is set. `Committee.Responsibility` is auto-filled from the `Roles`
  sheet lookup (`lookupResponsibility_`) whenever `Role` is set, not editable directly.
- **Dashboards** (`getDashboard_`, `getFinanceDashboard_`) are computed server-side over
  the full sheet reads, not client-side aggregations — `financeDashboard` additionally
  gates on `Finance_Incoming` access (`none` for `Member`).
- **File uploads** (`uploadFile_`) write straight to a single hardcoded `DRIVE_FOLDER_ID`
  and return a view-link URL; there's no separate `Documents` sheet row created for it in
  this design (contrast with the old `Documents` vault pattern in `SCHEMA.md`).
- Every sheet read/write goes through the generic helpers at the top of `Code.gs`
  (`readSheet_`, `writeRow_`, `findRowIndex_`, `updateRow_`, `deleteRow_`) keyed by each
  entity's first `SCHEMA` column as its ID field — `Participants` is the one exception,
  using `EventID` itself as the row key (one row per event, no separate ID column).

## Frontend architecture (as currently written — targets the OLD backend design)

The frontend was built for a different backend contract than what `Code.gs` implements
today (see the sync warning above). Its internal architecture, independent of that
mismatch:

### One generic CRUD hook, not per-module hooks

`useSheetData<T>(sheet, filters)` (`frontend/src/hooks/useSheetData.ts`) wraps TanStack
Query with 30s polling (`POLL_INTERVAL_MS`) plus refetch-on-focus, and is used by every
module screen instead of a bespoke hook per entity. `frontend/src/services/api.ts` is the
raw fetch client underneath it — POST bodies are sent as `text/plain` (not
`application/json`) specifically to dodge a CORS preflight, since Apps Script Web Apps
don't implement `doOptions`. This client currently calls `sheet`/`whoami`/`get`-shaped
actions that the rewritten `Code.gs` no longer serves.

### Shared-tab patterns (avoid duplicating near-identical screens)

- **Roster pattern**: Entertainment, Door Prize, Award, Souvenir, Decoration, Mini Games,
  and Others all live in one `Roster` sheet tab, disambiguated by a `Module` column, and
  are all rendered by one `<RosterModuleScreen moduleName="...">` component
  (`frontend/src/components/modules/MainEvent/RosterModule.tsx`) — see the `SCREENS` map in
  `App.tsx` for how each sidebar entry just passes a different `moduleName`. (In the new
  backend design these are 7 separate `SCHEMA` entities instead of one `Roster` tab — this
  frontend pattern would need to change if the rewrite is carried through.)
- **Budget & Checklist** are shared across both Pre-Event and Main Event phases via a
  row-level `Phase` column, filtered per screen (e.g. `<BudgetTable phase="Main Event">`).
- Follow this pattern for any new near-duplicate screens rather than adding new sheet tabs.

### Auth & permissions (old design)

- Frontend mirrors a `Permissions`-sheet RBAC via `PermissionContext`
  (`frontend/src/context/PermissionContext.tsx`), populated once from `whoami`, exposing
  `usePermissions().can(module, minRole)` to gate UI affordances. **This is UX only** — it
  assumes a backend that re-checks every write independently; the current `Code.gs` derives
  permission from `Committee.Role` instead and has no `whoami` action for this to call.

### Documents (Drive-backed file vault) — old design

Single `Documents` sheet tab + one shared Drive folder. Upload flow: browser reads file to
base64 (`frontend/src/hooks/useDocuments.ts`) → `action=uploadDocument` → decode, write to
Drive, create a `Documents` row. `<AttachmentsPanel>` filters this to one Budget/Roster row;
`<DocumentsScreen>` is the unfiltered vault. The current `Code.gs`'s `uploadFile_` doesn't
implement this action name or the `Documents` row-creation step.

### AI generation (Gemini, owner/Admin only) — old design

`aiGenerateText`/`aiGenerateImage` (`useAIGenerate.ts`, `AIPromptBox.tsx`) are gated on a
dedicated `AI` permission module and call actions that don't exist in the current
`Code.gs` at all — this feature has no backend counterpart in the rewrite as it stands.

### PDF export vs. import — two different, unrelated code paths

- **Proposal export** is entirely client-side via `@react-pdf/renderer`
  (`frontend/src/components/pdf/ProposalPdfDocument.tsx`) — no backend call. The PRD's new
  Information Architecture (`docs/core/PRD.md` §5) drops the standalone Proposal module in
  favor of `Finance → Sponsorship`; check which direction is intended before extending this.
- **Document import** (Quotation/Invoice/Contract/Permit/Receipt/Other) goes through the
  old Documents/Drive vault described above.

### UI component layer

`frontend/src/components/ui/` are hand-rolled Button/Input/Select/Modal/Badge primitives
styled to match shadcn/ui conventions (same prop shapes, Tailwind + `class-variance-authority`
ready) — shadcn/ui itself is not installed. If asked to swap in real shadcn/ui components,
the prop interfaces are close enough that it's a find-and-replace on imports, not a rewrite.

Design direction ("Tropical night market" — deep ink sidebar, mango→guava→purple gradient
for active states, warm paper background, `Fraunces` headers / `Plus Jakarta Sans` UI text)
lives in `tailwind.config.js` / `frontend/src/index.css`; also restated as a design-system
brief in `docs/core/DESIGN.md`. Desktop-first, no dark mode, by design.

## Known/deliberate gaps (don't "fix" without asking)

- No in-app Permissions/role-admin UI — under the old design, roles were assigned by
  editing the `Permissions` sheet tab directly; under the new design, roles come from each
  `Committee` member's `Role` value, still edited directly in the sheet.
- No offline queueing — a write while offline fails visibly rather than retrying.
- No rate limiting or usage logging on AI generation calls (old design only; not present
  in the current `Code.gs`).
- Uploaded PDFs are not parsed/OCR'd — cost fields are entered by hand after a human reads
  the attached document.
