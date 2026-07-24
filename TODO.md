# NourishFest 2026 — To Do

## Docs cleanup
- [ ] `docs/core/SCHEMA.md` still describes the earlier sheet-based backend
      design (Permissions sheet, Roster tab, Documents vault) — `Code.gs`'s
      own `SCHEMA`/`PERMISSIONS` consts are the current source of truth.
      Rewrite it to match, or delete it if `Code.gs` is considered
      self-documenting enough now.

## Decisions pending (from README §5 "Known gaps")
- [ ] No concurrency locking on writes — the previous backend wrapped every
      write in `LockService.getScriptLock()`; the current `Code.gs` doesn't.
      Fine at small-team volume; add back if simultaneous edits start
      clobbering each other.
- [ ] No file-size or file-type limit on the `uploadFile` action — the old
      Documents vault enforced a 10MB/PDF-only cap client- and server-side;
      the current single upload action has neither.
- [ ] No in-app admin UI for `Committee`/`Roles` beyond the Committee grid —
      `Roles` (responsibility lookup + informational permission tier) is
      still sheet-only, seeded once by `setupSheets()`.
- [ ] Event deletion has no cascade check — removing an `Event` in Event
      Management doesn't clean up `Budget`/`Checklist`/etc. rows still
      referencing its `EventID` (the UI warns on delete, nothing enforces
      it).

## Housekeeping
- [ ] No automated deploy path for `Code.gs` (manual copy-paste into the
      Apps Script editor each time) — `clasp` could script the push if this
      becomes a frequent pain point.
- [ ] No test suite for the frontend or `Code.gs`.
