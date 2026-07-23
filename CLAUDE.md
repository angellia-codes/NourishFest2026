# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```
NourishFest2026/
├── Code.gs        ← entire backend, paste directly into a Google Apps Script project
├── SCHEMA.md      ← Google Sheet tab/column reference — source of truth for data shape
├── README.md      ← setup instructions (backend deploy, Drive folder, Gemini key, permissions)
└── frontend/      ← React + Vite + TypeScript app
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

`frontend/.env` (copy from `.env.example`) needs `VITE_GAS_API_URL` pointing at the
deployed Apps Script `/exec` URL for the dev server to reach real data.

## Architecture

### One generic CRUD API, not per-module endpoints

`Code.gs` exposes a single Apps Script Web App with five actions — `list / get / create /
update / delete` — parametrized by a `sheet` name (`?action=list&sheet=Ideas&Status=New`).
`SHEET_SCHEMAS` at the top of `Code.gs` is the authoritative header-row map for all 12
tabs; `SCHEMA.md` documents the same thing for humans. Adding a new field means updating
`SHEET_SCHEMAS` (and re-running `setupSheets()` only affects sheets that don't exist yet —
it clears headers on the target sheet, not data validation elsewhere).

The frontend mirrors this with one hook, `useSheetData<T>(sheet, filters)`
(`frontend/src/hooks/useSheetData.ts`), used by every module screen instead of a bespoke
hook per entity. It wraps TanStack Query with 30s polling (`POLL_INTERVAL_MS`) plus
refetch-on-focus, and exposes `create/update/remove` mutations that invalidate the sheet's
query key on success. `frontend/src/services/api.ts` is the raw fetch client underneath it —
POST bodies are sent as `text/plain` (not `application/json`) specifically to dodge a CORS
preflight, since Apps Script Web Apps don't implement `doOptions`.

When adding a new module screen: add the tab to `SHEET_SCHEMAS` in `Code.gs` (+ mirror in
`SCHEMA.md`), then build a screen component that calls `useSheetData<YourType>('YourSheet')`
— no new backend route needed.

### Shared-tab patterns (avoid duplicating near-identical screens)

- **Roster pattern**: Entertainment, Door Prize, Award, Souvenir, Decoration, Mini Games,
  and Others all live in one `Roster` sheet tab, disambiguated by a `Module` column, and
  are all rendered by one `<RosterModuleScreen moduleName="...">` component
  (`frontend/src/components/modules/MainEvent/RosterModule.tsx`) — see the `SCREENS` map in
  `App.tsx` for how each sidebar entry just passes a different `moduleName`.
- **Budget & Checklist** are shared across both Pre-Event and Main Event phases via a
  row-level `Phase` column, filtered per screen (e.g. `<BudgetTable phase="Main Event">`).
- Follow this pattern for any new near-duplicate screens rather than adding new sheet tabs.

### Auth & permissions

- The backend identifies the caller via `Session.getActiveUser().getEmail()`
  (`getUserEmail()` in `Code.gs`) — this only works reliably when the Web App is deployed
  with "Execute as: User accessing the web app" inside a Workspace-domain-restricted
  deployment. Personal Gmail accounts will get `''` and fail closed.
- Roles (`Viewer` < `Editor` < `Admin`) are rows in the `Permissions` sheet tab, keyed by
  `Email` + `Module` (module name = sheet name, or `*` for all-module access, or `AI` for
  the Gemini generation gate). `hasPermission(email, module, minRole)` is the single
  server-side gate — reads require `Viewer`, writes (`create/update/delete/uploadDocument`)
  require `Editor`.
- Frontend mirrors this via `PermissionContext` (`frontend/src/context/PermissionContext.tsx`),
  populated once from `whoami`, exposing `usePermissions().can(module, minRole)` to gate UI
  affordances. **This is UX only** — the backend re-checks every write independently, so
  never rely on frontend permission checks as the real security boundary when reasoning
  about auth changes.
- Every write handler in `Code.gs` is wrapped in `withLock()` (`LockService.getScriptLock()`)
  to serialize concurrent edits from multiple organizers against the same Sheet.

### Documents (Drive-backed file vault)

Single `Documents` sheet tab + one shared Drive folder (`DOCUMENTS_FOLDER_ID` in `Code.gs`,
must be set manually post-deploy). Upload flow: browser reads file to base64
(`frontend/src/hooks/useDocuments.ts`) → `action=uploadDocument` → `Code.gs` decodes,
writes the blob into the shared Drive folder, and creates a `Documents` row with the
resulting Drive link — one action does both file storage and metadata row creation.
`<AttachmentsPanel>` filters this to one Budget/Roster row; `<DocumentsScreen>` is the
unfiltered vault. 10MB/file cap (`MAX_UPLOAD_BYTES` in `Code.gs`, `MAX_FILE_BYTES` in
`UploadDocumentModal.tsx` — keep both in sync). PDFs are stored as-is, never parsed/OCR'd.

### AI generation (Gemini, owner/Admin only)

Two backend actions, `aiGenerateText` and `aiGenerateImage`, gated on a dedicated `AI`
permission module (not tied to any sheet). The Gemini API key is never in source — it's
set once via the `NourishFest Admin → Set Gemini API Key` custom menu (installed by
`onOpen()`) into Script Properties, read by `getGeminiApiKey()`. Text generation uses
Gemini's `responseSchema` to force a strict JSON string array, so the frontend
(`useAIGenerate.ts`, `AIPromptBox.tsx`) never guess-parses free text. Image generation
returns base64 for **preview only**; nothing is written to Drive until the organizer
explicitly saves, which reuses the same `uploadDocument` pipeline (tagged
`DocType: 'Design'`). Model names are hardcoded constants (`GEMINI_TEXT_MODEL`,
`GEMINI_IMAGE_MODEL`) — check them if generation starts failing, Google renames/retires
Gemini models occasionally.

### PDF export vs. import — two different, unrelated code paths

- **Proposal export** (the only document Nourish *generates*) is entirely client-side via
  `@react-pdf/renderer` (`frontend/src/components/pdf/ProposalPdfDocument.tsx`) — no backend
  call, not stored in `Documents`.
- **Document import** (Quotation/Invoice/Contract/Permit/Receipt/Other, things Nourish
  *receives*) goes through the Documents/Drive vault described above. Don't conflate the two
  when asked about "PDFs."

### UI component layer

`frontend/src/components/ui/` are hand-rolled Button/Input/Select/Modal/Badge primitives
styled to match shadcn/ui conventions (same prop shapes, Tailwind + `class-variance-authority`
ready) — shadcn/ui itself is not installed. If asked to swap in real shadcn/ui components,
the prop interfaces are close enough that it's a find-and-replace on imports, not a rewrite.

Design direction ("Tropical night market" — deep ink sidebar, mango→guava→purple gradient
for active states, warm paper background, `Fraunces` headers / `Plus Jakarta Sans` UI text)
lives in `tailwind.config.js` / `frontend/src/index.css`. Desktop-first, no dark mode, by
design.

## Known/deliberate gaps (don't "fix" without asking)

- No in-app Permissions admin UI — roles are assigned by editing the `Permissions` sheet
  tab directly.
- No offline queueing — a write while offline fails visibly rather than retrying.
- No rate limiting or usage logging on AI generation calls, beyond the Admin-only gate.
- Uploaded PDFs are not parsed/OCR'd — `Budget.ActualCost` etc. are entered by hand after a
  human reads the attached document.
