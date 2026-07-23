import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, Phone, Mail } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Textarea } from '@/components/ui/Primitives';
import type { CommitteeMember } from '@/types';

const EMPTY: Partial<CommitteeMember> = { Name: '', Role: '', Team: '', Phone: '', Email: '', Responsibilities: '', Notes: '' };

export function CommitteeGrid() {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<CommitteeMember>('Committee');
  const { can } = usePermissions();
  const canEdit = can('Committee', 'Editor');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CommitteeMember | null>(null);
  const [form, setForm] = useState<Partial<CommitteeMember>>(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (m: CommitteeMember) => { setEditing(m); setForm(m); setOpen(true); };
  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create(form);
    setOpen(false);
  };

  const byRole = items.reduce<Record<string, CommitteeMember[]>>((acc, m) => {
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
                <div key={m.Id} className="rounded-xl border border-ink/10 bg-white p-4 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{m.Name || '— unassigned —'}</p>
                      <p className="text-xs text-ink/50">{m.Team}</p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(m)} className="text-ink/40 hover:text-ink">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(m.Id)} className="text-ink/40 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-ink/60">{m.Responsibilities}</p>
                  <div className="flex flex-col gap-0.5 pt-1 text-xs text-ink/50">
                    {m.Phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {m.Phone}
                      </span>
                    )}
                    {m.Email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {m.Email}
                      </span>
                    )}
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
            <Field label="Role">
              <Input value={form.Role ?? ''} onChange={(e) => setForm({ ...form, Role: e.target.value })} />
            </Field>
            <Field label="Team">
              <Input value={form.Team ?? ''} onChange={(e) => setForm({ ...form, Team: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.Phone ?? ''} onChange={(e) => setForm({ ...form, Phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.Email ?? ''} onChange={(e) => setForm({ ...form, Email: e.target.value })} />
            </Field>
          </div>
          <Field label="Responsibilities">
            <Textarea value={form.Responsibilities ?? ''} onChange={(e) => setForm({ ...form, Responsibilities: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isMutating || !form.Name}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
