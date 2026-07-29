import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, Mail, FileDown } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Select } from '@/components/ui/Primitives';
import { esc, printHtml } from '@/components/shared/print';
import type { Committee } from '@/types';

const ROLES = [
  'Chairperson',
  'Vice Chairperson',
  'Treasurer',
  'Secretary',
  'Advisor',
  'Program Coordinator',
  'F&B Coordinator',
  'Logistics/Decoration/Merch Coordinator',
  'Security Coordinator',
  'Documentation Coordinator',
  'Sponsorship Coordinator',
];

const STATUSES = ['Active', 'Inactive'];

const EMPTY: Partial<Committee> = { Name: '', Email: '', Department: '', Role: '', Status: 'Active' };

// --- Org chart export (browser print-to-PDF, no pdf dependency) ---

const node = (m: Committee) => `
  <div class="node${m.Status !== 'Active' ? ' inactive' : ''}">
    <strong>${esc(m.Name || '— vacant —')}</strong>
    <span>${esc(m.Role || 'Unassigned Position')}</span>
    ${m.Department ? `<em>${esc(m.Department)}</em>` : ''}
    ${m.Status !== 'Active' ? `<span class="tag">${esc(m.Status)}</span>` : ''}
  </div>`;

/** Renders `members` grouped by role into an org tree and opens the print dialog. */
function exportOrgChart(members: Committee[]) {
  const of = (...roles: string[]) => members.filter((m) => roles.includes(m.Role));
  const named = new Set(['Advisor', 'Chairperson', 'Vice Chairperson', 'Secretary', 'Treasurer']);
  const rest = members.filter((m) => !named.has(m.Role)); // coordinators + anything unrecognised

  const li = (m: Committee, children = '') => `<li>${node(m)}${children}</li>`;
  const chair = of('Chairperson');
  const vice = of('Vice Chairperson');

  // Chair(s) on top; Secretary/Treasurer beside Vice Chairperson; coordinators under Vice Chairperson.
  const viceBranch = vice.map((v) => li(v, rest.length ? `<ul>${rest.map((m) => li(m)).join('')}</ul>` : ''));
  const secondRow = [...viceBranch, ...of('Secretary', 'Treasurer').map((m) => li(m))];
  const under = secondRow.length ? `<ul>${secondRow.join('')}</ul>` : '';
  // No Vice Chairperson? Coordinators hang straight off the chair.
  const body = chair.length
    ? `<ul class="tree">${chair.map((c) => li(c, vice.length ? under : `<ul>${[...of('Secretary', 'Treasurer'), ...rest].map((m) => li(m)).join('')}</ul>`)).join('')}</ul>`
    : `<ul class="tree"><li>${members.map(node).join('')}</li></ul>`; // ponytail: no chair = flat list, good enough

  const advisors = of('Advisor');
  const css = `
  @page { size: A4 landscape; margin: 12mm; }
  body { font: 12px/1.4 system-ui, sans-serif; color: #1b1b1b; text-align: center; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #777; font-size: 11px; margin-bottom: 18px; }
  .node { display: inline-flex; flex-direction: column; gap: 1px; border: 1px solid #cfcfcf; border-radius: 8px;
          padding: 8px 12px; background: #fff; min-width: 130px; }
  .node strong { font-size: 12px; }
  .node span { font-size: 10px; color: #666; }
  .node em { font-size: 10px; color: #999; font-style: normal; }
  .node.inactive { opacity: .55; border-style: dashed; }
  .tag { font-size: 9px; color: #b00; }
  .advisors { display: flex; gap: 10px; justify-content: center; margin-bottom: 10px; }
  ul { padding: 0; margin: 0; }
  .tree ul { position: relative; padding-top: 20px; display: flex; justify-content: center; flex-wrap: wrap; }
  .tree li { list-style: none; position: relative; padding: 20px 8px 0; }
  .tree li::before, .tree li::after { content: ''; position: absolute; top: 0; right: 50%;
          border-top: 1px solid #bbb; width: 50%; height: 20px; }
  .tree li::after { right: auto; left: 50%; border-left: 1px solid #bbb; }
  .tree li:only-child { padding-top: 0; }
  .tree li:only-child::before, .tree li:only-child::after { display: none; }
  .tree li:first-child::before, .tree li:last-child::after { border: 0 none; }
  .tree li:last-child::before { border-right: 1px solid #bbb; border-radius: 0 6px 0 0; }
  .tree li:first-child::after { border-radius: 6px 0 0 0; }
  .tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 1px solid #bbb; height: 20px; }
  li { break-inside: avoid; }`;

  const html = `<h1>NourishFest 2026 — Committee</h1>
<div class="sub">${members.length} member${members.length === 1 ? '' : 's'}</div>
${advisors.length ? `<div class="advisors">${advisors.map(node).join('')}</div>` : ''}
${body}`;

  printHtml('NourishFest 2026 — Committee Org Chart', html, css);
}

export function CommitteeGrid() {
  const { items, isLoading, create, update, remove, isMutating } = useEntityData<Committee>('Committee');
  const { canWrite } = usePermissions();
  const canEdit = canWrite('Committee');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Committee | null>(null);
  const [form, setForm] = useState<Partial<Committee>>(EMPTY);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (m: Committee) => {
    setEditing(m);
    setForm(m);
    setOpen(true);
  };
  const save = async () => {
    if (editing) await update(editing.MemberID, form);
    else await create(form);
    setOpen(false);
  };

  const byRole = items.reduce<Record<string, Committee[]>>((acc, m) => {
    const key = m.Role || 'Unassigned Position';
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Committee</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => exportOrgChart(items)} disabled={!items.length}>
            <FileDown className="h-4 w-4" /> Export Org Chart
          </Button>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading committee…
        </div>
      ) : (
        Object.entries(byRole).map(([role, members]) => (
          <div key={role} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              {role} {members.length > 1 && `(${members.length})`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {members.map((m) => (
                <div key={m.MemberID} className="rounded-xl border border-ink/10 bg-white p-4 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{m.Name || '— unassigned —'}</p>
                      <p className="text-xs text-ink/50">{m.Department}</p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(m)} className="text-ink/40 hover:text-ink">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(m.MemberID)} className="text-ink/40 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-ink/60">{m.Responsibility}</p>
                  <div className="flex items-center justify-between pt-1 text-xs text-ink/50">
                    {m.Email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {m.Email}
                      </span>
                    )}
                    <span className={m.Status === 'Active' ? 'text-jungle' : 'text-ink/40'}>{m.Status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Member' : 'Add Member'}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={form.Name ?? ''} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.Email ?? ''} onChange={(e) => setForm({ ...form, Email: e.target.value })} />
            </Field>
            <Field label="Department">
              <Input value={form.Department ?? ''} onChange={(e) => setForm({ ...form, Department: e.target.value })} />
            </Field>
            <Field label="Role">
              <Select value={form.Role ?? ''} onChange={(e) => setForm({ ...form, Role: e.target.value })}>
                <option value="">— select —</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.Status ?? 'Active'} onChange={(e) => setForm({ ...form, Status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-xs text-ink/40">
            Responsibility is auto-filled from the selected Role once saved.
            {editing?.Responsibility && ` Current: "${editing.Responsibility}"`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isMutating || !form.Name || !form.Role}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
