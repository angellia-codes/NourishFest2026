import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Textarea } from '@/components/ui/Primitives';
import type { Participant } from '@/types';

const EMPTY: Partial<Participant> = { Name: '', Outlet: '', RoleCategory: '', Contact: '', RSVPStatus: 'Pending', Attendance: '', Notes: '' };

const RSVP_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Confirmed: 'success', Pending: 'warning', Declined: 'danger',
};

export function ParticipantRoster() {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<Participant>('ParticipantDetail');
  const { can } = usePermissions();
  const canEdit = can('ParticipantDetail', 'Editor');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [form, setForm] = useState<Partial<Participant>>(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (p: Participant) => { setEditing(p); setForm(p); setOpen(true); };
  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create(form);
    setOpen(false);
  };

  const confirmedCount = items.filter((p) => p.RSVPStatus === 'Confirmed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Participant Detail</h2>
          <p className="text-sm text-ink/50">{confirmedCount} confirmed of {items.length} total</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Participant
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading roster…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Outlet</th>
                <th className="px-4 py-3">Role/Category</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">RSVP</th>
                <th className="px-4 py-3">Attendance</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.Id} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 font-medium">{p.Name}</td>
                  <td className="px-4 py-3 text-ink/60">{p.Outlet}</td>
                  <td className="px-4 py-3 text-ink/60">{p.RoleCategory}</td>
                  <td className="px-4 py-3 text-ink/60">{p.Contact}</td>
                  <td className="px-4 py-3">
                    <Badge tone={RSVP_TONE[p.RSVPStatus] ?? 'neutral'}>{p.RSVPStatus}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{p.Attendance}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="text-ink/40 hover:text-ink">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(p.Id)} className="text-ink/40 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Participant' : 'Add Participant'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={form.Name ?? ''} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
            </Field>
            <Field label="Outlet">
              <Input value={form.Outlet ?? ''} onChange={(e) => setForm({ ...form, Outlet: e.target.value })} />
            </Field>
            <Field label="Role/Category">
              <Input value={form.RoleCategory ?? ''} onChange={(e) => setForm({ ...form, RoleCategory: e.target.value })} placeholder="Staff / Guest / VIP" />
            </Field>
            <Field label="Contact">
              <Input value={form.Contact ?? ''} onChange={(e) => setForm({ ...form, Contact: e.target.value })} />
            </Field>
            <Field label="RSVP Status">
              <Input value={form.RSVPStatus ?? ''} onChange={(e) => setForm({ ...form, RSVPStatus: e.target.value })} placeholder="Confirmed / Pending / Declined" />
            </Field>
            <Field label="Attendance">
              <Input value={form.Attendance ?? ''} onChange={(e) => setForm({ ...form, Attendance: e.target.value })} placeholder="Checked-in / No-show" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.Notes ?? ''} onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
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
