# NourishFest 2026 — To Do

## Verify the Supabase migration

The backend was rewritten from Google Apps Script to Supabase, but **none of
`supabase/schema.sql` has been run against a live project yet** — the frontend
builds and the module graph resolves, and that is all that has been checked.

- [ ] Run `supabase/schema.sql` in the SQL Editor and seed the first `Committee`
      row (see the bottom of that file). Nothing works until this is done.
- [ ] Sign in with Google and confirm `PermissionContext` reports your role —
      broken sign-in is what prompted the migration, so confirm it first.
- [ ] **Test as a Member, not just as Admin.** Add a second `Committee` row with
      a coordinator role and check that Finance is denied and Checklist edits are
      limited to that person's own tasks' `Status`/`Remark`. RLS is the reason
      for this migration; an Admin-only pass exercises none of it.
- [ ] Confirm the server-computed fields: `TotalEstimationCost` on a comparison
      row, and `Variance` appearing/clearing as a budget row is approved and
      unapproved. Reload to prove they came from Postgres, not client math.
- [ ] Submit an Idea twice for the same `Scope` — the second must fail visibly.
- [ ] Upload a file, reload, confirm the link still resolves.
- [ ] Deploy the Edge Function and exercise the Ideas AI box as Admin (5
      suggestions) and as a Member (denied).

## Docs cleanup
- [ ] `docs/core/SCHEMA.md` still describes the retired sheet-based backend
      (Permissions sheet, Roster tab, Documents vault). `supabase/schema.sql` is
      the source of truth. Rewrite it against the Postgres schema, or delete it
      if the SQL is considered self-documenting enough.

## Decisions pending (from README §5 "Known gaps")
- [ ] Event deletion has no cascade check — only `Participants` is cleaned up
      (its primary key is a foreign key to `Events`). `BudgetBreakdown`,
      `Checklist`, `Rundown` and the comparison tables hold `EventID` as plain
      text with no constraint, so deleting an event orphans their rows. The UI
      warns on delete; nothing enforces it. Adding real foreign keys would fix
      this at the cost of rejecting rows that reference a missing event.
- [ ] No file-size or file-type limit on uploads — the retired Documents vault
      enforced a 10MB/PDF-only cap client- and server-side; the current upload
      has neither. Supabase can cap size per bucket.
- [ ] No in-app admin UI for `Committee`/`Roles` beyond the Committee grid —
      roles are assigned by editing the table directly in Supabase. Note that a
      `Role` typo silently demotes someone to Member, which a picker bound to
      `Roles` would prevent.

## Housekeeping
- [ ] `npm run lint` fails — ESLint 9 wants an `eslint.config.js` and the repo
      still has the older config format. Pre-existing, unrelated to the backend.
- [ ] No generated database types — `frontend/src/services/api.ts` casts
      insert/update payloads with `as never` because of it. `supabase gen types
      typescript` would remove the casts and type every column.
- [ ] No test suite for the frontend or the SQL.
- [ ] `schema.sql` is a create-from-scratch script, not a migration. Once the
      project is live, changes need incremental `alter table` statements —
      consider adopting `supabase/migrations/` before the schema drifts from the
      file.
