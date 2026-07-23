# NourishFest 2026 — Event Management App

Full-stack event ops tool: React/Vite/TS frontend + Google Apps Script backend
over a Google Sheet. Two top-level modules — **Road to NourishFest** (Pre-Event)
and **NourishFest** (Main Event) — covering all 6 core areas plus the 13
Main Event sub-modules.

```
nourishfest/
├── backend/
│   ├── Code.gs        ← paste into Apps Script editor
│   └── SCHEMA.md       ← sheet tab/column reference
└── frontend/            ← React + Vite + TypeScript app
```

---

## 1. Backend Setup (Google Apps Script)

1. Create a new Google Sheet (this becomes your database).
2. Extensions → Apps Script. Delete the default `Code.gs` content and paste
   in `backend/Code.gs`.
3. In the function dropdown at the top, select `setupSheets`, click **Run**.
   Grant the permissions it asks for. This creates all 13 tabs with headers
   and adds *you* as global Admin in the `Permissions` tab — check the sheet
   to confirm.
4. **Deploy → New deployment → Web app**
   - Execute as: **User accessing the web app**
   - Who has access: **Anyone within [your Workspace domain]**
   - Copy the deployment URL (ends in `/exec`) — this is `VITE_GAS_API_URL`.

   ⚠️ "Execute as: User accessing the web app" only reliably returns an email
   via `Session.getActiveUser()` inside a Workspace domain-restricted
   deployment. If your organizers are on personal Gmail accounts, this will
   silently return `''` and every request will be treated as unauthenticated.
   If that's your situation, tell me and I'll switch `getUserEmail()` to
   accept an email from the frontend instead (with a shared-secret check).

5. **Documents feature (vendor quotations/invoices/contracts uploads):**
   - Create a Google Drive folder, e.g. "NourishFest 2026 Documents".
   - Share it with **Editor** access to every organizer (or your whole
     Workspace domain) — this matters because the Web App runs as *the
     user accessing it*, so without shared folder access, each organizer's
     uploads would otherwise land in their own private Drive instead of a
     common place.
   - Copy the folder ID from its URL and paste it into `DOCUMENTS_FOLDER_ID`
     near the top of `Code.gs`, then redeploy (**Deploy → Manage
     deployments → Edit → New version**).
7. **AI generation (Gemini) — owner/Admin only:**
   - Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
   - **Close and reopen the Google Sheet** (or refresh the tab) so the
     `onOpen()` trigger installs the custom menu.
   - In the Sheet, use menu **NourishFest Admin → Set Gemini API Key**,
     paste it in. It's saved to this script's Script Properties — never
     written into `Code.gs` source, so it's safe even if you ever share the
     script file with someone.
   - AI generation only shows up in the UI, and only works on the backend,
     for users with `Admin` role — either the global `Module='*'` Admin
     (that's you, from `setupSheets()`), or anyone you explicitly grant a
     `Module='AI', Role='Admin'` row in `Permissions`.
8. Add organizers to the `Permissions` tab manually (or build a small admin
   screen — not included yet, since only you need write access to grant
   roles initially):
   `Id | Email | Module | Role | Name`
   - `Module = '*'` grants that Role everywhere.
   - `Module = 'Budget'` grants that Role on Budget only, etc. — module
     names must exactly match tab names in `SHEET_SCHEMAS` (see SCHEMA.md).
   - Every organizer needs at least one row to see anything (reads require
     `Viewer`, writes require `Editor`/`Admin`).

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
no dark mode, per your brief. Adjust tokens in `tailwind.config.js` /
`src/index.css`.

---

## 3. Architecture Notes

- **One generic API, not 11 bespoke endpoints.** `Code.gs` exposes
  `list / get / create / update / delete`, parametrized by `sheet` name.
  Frontend mirrors this with one `useSheetData<T>('SheetName', filters)`
  hook used by every module — see `src/hooks/useSheetData.ts`. This is why
  adding a 12th tab later doesn't require new backend routes.
- **Roster pattern (Pattern B).** Entertainment, Door Prize, Award, Souvenir,
  Decoration, Mini Games, and Others all share one `Roster` sheet tab and one
  `<RosterModuleScreen moduleName="..." />` component — see App.tsx. This
  avoids 7 near-duplicate CRUD screens.
- **Budget & Checklist are shared across phases**, tagged by `Phase` and
  `Module` columns, filtered per screen (`<BudgetTable phase="Main Event" />`).
- **Permissions** are fetched once via `whoami` and held in
  `PermissionContext` — `usePermissions().can('Budget', 'Editor')` gates
  buttons/edit affordances throughout. The backend independently re-checks
  every write, so a hidden button is UX only, not the real security boundary.
- **Polling**: TanStack Query refetches every 30s (`POLL_INTERVAL_MS` in
  `useSheetData.ts`) plus on window focus. No offline queueing, per your
  scope decision — a write while offline will just fail with a visible error.
- **Concurrency**: every write on the backend is wrapped in
  `LockService.getScriptLock()`, so simultaneous edits from multiple
  organizers serialize instead of corrupting rows.
- **PDF export (Proposal only)** happens entirely client-side via
  `@react-pdf/renderer` (`src/components/pdf/ProposalPdfDocument.tsx`) — no
  backend round-trip, no Drive quota used. This is the only document Nourish
  *generates*; it's not stored in the `Documents` tab.
- **PDF import (Quotation/Invoice/Contract/Permit/Receipt/Other)** is a
  single `Documents` vault (`src/components/documents/`). Upload flow: file
  → base64 in the browser (`useDocuments.ts`) → `action=uploadDocument` →
  backend decodes and writes it into the shared Drive folder
  (`DOCUMENTS_FOLDER_ID` in `Code.gs`) → a `Documents` row is created with
  the resulting Drive link. `<AttachmentsPanel>` embeds this filtered to one
  Budget/Roster row; `<DocumentsScreen>` is the unfiltered vault. No OCR or
  data extraction from uploaded PDFs — they're stored as reference files,
  not parsed into structured line items.
- **AI generation (Gemini, owner/Admin only).** Two backend actions,
  `aiGenerateText` and `aiGenerateImage`, gated on a dedicated `AI`
  permission module rather than any sheet — see the `AI_MODULE` checks in
  `Code.gs`. Text suggestions (Ideas/Theme/Tagline/Decoration) come back as
  a strict JSON array via Gemini's `responseSchema`, so the frontend never
  has to guess-parse free text. Images are generated and returned as base64
  to the browser for **preview only** — nothing touches Drive until the
  organizer clicks "Save to Documents," which reuses the same
  `uploadDocument` pipeline as manual uploads (tagged `DocType: 'Design'`).
  `<AIPromptBox>` / `<AIImagePanel>` (`src/components/ai/`) render nothing
  for non-Admins; the backend independently re-checks regardless.

## 4. What's fully built vs. follow-the-pattern

Fully implemented, ready to run:
Ideas, Committee, Budget, Proposal (+ presentation view + PDF export),
Checklist (kanban), Theme & Tagline, Venue, all 7 Roster modules, Rundown,
Nourish Got Talent, Participant Detail, Documents vault (upload/browse/
attach quotations, invoices, contracts, permits, receipts), AI-assisted
suggestions (text on Ideas/Theme/Tagline/Decoration, images on
Theme/Decoration) — owner/Admin only.

That's all 19 module screens — every sub-module in your brief has a working
component wired into `App.tsx`, plus attachments on Budget and Roster rows,
plus AI generation where you asked for it. If you want a 20th screen (e.g. a
per-organizer "My Tasks" view, or an Admin screen to manage the
`Permissions` tab from the UI instead of editing the sheet directly), it
follows the exact same `useSheetData` + form-in-a-Modal pattern as
everything above.

## 5. Known gaps to decide on next

- No in-app Permissions admin UI yet — role assignment is direct sheet
  editing for now. Want me to build one (Admin-only screen, itself just
  another `useSheetData('Permissions')` table)?
- `Category` fields (Ideas, Budget, Roster) are free-text inputs, not
  dropdowns — tell me if you want fixed category lists per module and I'll
  convert those to `<Select>`s.
- Uploaded PDFs (Quotation/Invoice/etc.) are stored as-is, not parsed —
  amounts on a vendor's invoice PDF won't sync to the `Budget` sheet
  automatically; someone still enters `ActualCost` by hand after reading
  the attached file. Say the word if you want OCR-based extraction later.
- AI-generated images are unlinked "general concept" documents (Theme
  mood images, Decoration moodboards) — they're not tied to one specific
  Roster row, since there's often no single row they belong to yet. If you
  want to generate an image *for a specific existing decoration item*, tell
  me and I'll add that entry point too.
- Gemini model names (`GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL` in
  `Code.gs`) are set to `gemini-2.5-flash` / `gemini-2.5-flash-image` —
  solid, current, cost-effective defaults as of writing. Google renames/
  retires models occasionally; if generation starts failing, check
  [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)
  and swap the constant.
- **No rate limiting or usage logging on AI calls** — each click costs a
  small amount against your Gemini API key (text generations are cents;
  image generations more, though still small at low volume). Admin-only
  gating limits *who* can trigger it, but there's no cap on *how often*.
  Fine at organizer-team volume; say the word if you want a daily call cap
  or a usage log.
- 10MB upload limit per file (`MAX_UPLOAD_BYTES` in `Code.gs` /
  `MAX_FILE_BYTES` in `UploadDocumentModal.tsx`) — raise both together if
  vendors send larger scanned PDFs.
- `DOCUMENTS_FOLDER_ID` must be set manually post-deploy (step 5 above) —
  uploads will fail with a clear error until it is.
