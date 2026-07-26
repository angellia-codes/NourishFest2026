# Frontend architecture

React + Vite + TypeScript SPA on Supabase. The backend contract lives in
`supabase/schema.sql`; `src/types/index.ts` mirrors it 1:1 by column name.

## One generic CRUD hook, not per-module hooks

`useEntityData<T>(entity, { eventId })` (`src/hooks/useEntityData.ts`) wraps TanStack
Query with 30s polling (`POLL_INTERVAL_MS`) plus refetch-on-focus, and is used by every
module screen instead of a bespoke hook per entity. `eventId` is the only server-side
filter — anything else (Status, ApprovalStatus) is filtered client-side by the caller.

`src/services/api.ts` sits underneath it and is **the only file that knows about
Supabase**. Just 8 files import it, and that narrowness is load-bearing: it's what made
the Apps Script → Supabase migration a rewrite of one file instead of twenty. Keep the
method surface stable and keep Supabase types out of the exported signatures.

Errors: `api.ts` converts every `PostgrestError` into a plain `Error`, so RLS denials and
constraint violations surface through the same TanStack Query error paths screens already
render — a failed write shows the database's message, not a generic one.

## Shared-tab patterns (avoid duplicating near-identical screens)

- **`<EntityCrudTable>`** (`src/components/shared/EntityCrudTable.tsx`) renders the
  list + create/edit modal + delete for a column spec, and 9 near-identical screens use it:
  Venue/Decoration/Souvenir comparisons, Entertainment, Awards, DoorPrize,
  NourishGotTalent, Rundown, FinanceIncoming. Each is a thin file declaring its columns
  and passing an entity name.
- Reach for it before writing a new screen. A new table-shaped module should be a column
  spec, not another 200-line component.
- Screens that aren't table-shaped (Dashboard, Budget, Committee, Ideas, Checklist,
  Participants, EventManagement) are bespoke on purpose — they have their own layouts,
  aggregate rows, or per-row permission rules.

## Auth & permissions

- `AuthContext` (`src/context/AuthContext.tsx`) wraps `supabase.auth` — Google OAuth via
  `signInWithOAuth`, session persisted and refreshed by the Supabase client. There is no
  token handling here; the old version stored a Google ID token in `sessionStorage` and
  attached it to every request by hand.
- `PermissionContext` (`src/context/PermissionContext.tsx`) calls `api.me()` whenever the
  session changes and exposes `canRead`/`canWrite`/`accessLevel` to gate UI affordances.
  **This is UX only.** The real enforcement is RLS in Postgres — `ENTITY_ACCESS` in
  `types/index.ts` is a hand-maintained mirror of the policies in `supabase/schema.sql`,
  so changing one means changing the other.
- `canWrite()` is deliberately false for `'special'` (Ideas, Checklist). Those screens
  check `accessLevel()` themselves, because "a Member may write *some* of this" can't be
  expressed as a boolean.

## File uploads

`useFileUpload` → `api.uploadFile(file)` → the public `attachments` Storage bucket,
returning a URL stored directly in the row's `*FileLink`/`*ImageLink` field. No metadata
row, no categorization. Files go under a randomised path so two people uploading
`quotation.pdf` don't overwrite each other.

## AI generation (Gemini, Admin only)

`useAIGenerate` → `api.aiGenerate` → the `ai-generate` Edge Function
(`supabase/functions/ai-generate/`), which holds the Gemini key server-side and re-checks
`current_permission() = 'Admin'`. Note that `functions.invoke()` collapses every non-2xx
into a generic message — `api.ts` digs the real reason out of the response body, so don't
"simplify" that error handling away.

## UI component layer

`frontend/src/components/ui/` are hand-rolled Button/Input/Select/Modal/Badge primitives
styled to match shadcn/ui conventions (same prop shapes, Tailwind + `class-variance-authority`
ready) — shadcn/ui itself is not installed. If asked to swap in real shadcn/ui components,
the prop interfaces are close enough that it's a find-and-replace on imports, not a rewrite.

Design direction lives in `tailwind.config.js` / `frontend/src/index.css` and is restated as
a design-system brief in `docs/core/DESIGN.md`. Desktop-first, no dark mode, by design.
