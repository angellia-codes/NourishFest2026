# NourishFest 2026 — To Do

## Docs cleanup
- [ ] `README.md`'s repo tree and setup steps still say `backend/Code.gs` /
      `backend/SCHEMA.md` — actual layout is `Code.gs` at root and
      `docs/core/SCHEMA.md`. Update the tree diagram and the `SCHEMA.md`
      cross-references (README.md lines 9-13, 67; CLAUDE.md lines 10, 46, 59).

## Decisions pending (from README §5 "Known gaps")
- [ ] Permissions admin UI — role assignment is still direct sheet editing.
- [ ] `Category` fields (Ideas, Budget, Roster) are free-text, not fixed
      dropdown lists — decide if they should be constrained per module.
- [ ] Uploaded invoice/quotation PDFs aren't parsed — `Budget.ActualCost`
      stays a manual entry. OCR extraction would be new scope.
- [ ] AI-generated images (Theme/Decoration) aren't linked to a specific
      Roster row — only "general concept" moodboards today.
- [ ] No rate limit or usage log on AI generation calls (Admin-only gate
      only limits *who*, not *how often*).
- [ ] 10MB per-file upload cap (`MAX_UPLOAD_BYTES` / `MAX_FILE_BYTES`) —
      raise if vendors send larger scanned PDFs.

## Housekeeping
- [ ] Production bundle is a single 1.7MB chunk (vite build warning) —
      code-split if load time becomes a problem (e.g. PDF export / AI panels
      as dynamic imports).
- [ ] No automated deploy path for `Code.gs` (manual copy-paste into the
      Apps Script editor each time) — `clasp` could script the push if this
      becomes a frequent pain point.
- [ ] No test suite for the frontend or `Code.gs`.
