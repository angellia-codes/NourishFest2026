import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, Mail } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Select } from '@/components/ui/Primitives';
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
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        )}
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
          <div className="grid grid-cols-2 gap-3">
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
