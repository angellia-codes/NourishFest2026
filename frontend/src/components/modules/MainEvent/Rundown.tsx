import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Textarea } from '@/components/ui/Primitives';
import type { RundownItem } from '@/types';

const EMPTY: Partial<RundownItem> = { TimeStart: '', TimeEnd: '', Segment: '', PIC: '', Location: '', Notes: '', Order: 0 };

export function RundownTimeline() {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<RundownItem>('Rundown');
  const { can } = usePermissions();
  const canEdit = can('Rundown', 'Editor');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RundownItem | null>(null);
  const [form, setForm] = useState<Partial<RundownItem>>(EMPTY);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, Order: items.length }); setOpen(true); };
  const openEdit = (r: RundownItem) => { setEditing(r); setForm(r); setOpen(true); };
  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create(form);
    setOpen(false);
  };

  const sorted = [...items].sort((a, b) => a.TimeStart.localeCompare(b.TimeStart) || Number(a.Order) - Number(b.Order));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Rundown Event</h2>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Segment
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rundown…
        </div>
      ) : (
        <div className="relative border-l-2 border-guava/20 ml-2 space-y-3">
          {sorted.map((r) => (
            <div key={r.Id} className="relative pl-6 pb-1">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-guava" />
              <div className="rounded-xl border border-ink/10 bg-white p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-guava">
                    {r.TimeStart} – {r.TimeEnd}
                  </p>
                  <p className="text-sm font-medium">{r.Segment}</p>
                  <p className="text-xs text-ink/50">{r.Location} · PIC: {r.PIC}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(r)} className="text-ink/40 hover:text-ink">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(r.Id)} className="text-ink/40 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Segment' : 'Add Segment'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time">
              <Input type="time" value={form.TimeStart ?? ''} onChange={(e) => setForm({ ...form, TimeStart: e.target.value })} />
            </Field>
            <Field label="End Time">
              <Input type="time" value={form.TimeEnd ?? ''} onChange={(e) => setForm({ ...form, TimeEnd: e.target.value })} />
            </Field>
          </div>
          <Field label="Segment">
            <Input value={form.Segment ?? ''} onChange={(e) => setForm({ ...form, Segment: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PIC">
              <Input value={form.PIC ?? ''} onChange={(e) => setForm({ ...form, PIC: e.target.value })} />
            </Field>
            <Field label="Location / Stage">
              <Input value={form.Location ?? ''} onChange={(e) => setForm({ ...form, Location: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.Notes ?? ''} onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isMutating || !form.Segment}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
