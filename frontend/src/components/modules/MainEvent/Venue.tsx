import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, MapPin } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import type { Venue, VenueStatus } from '@/types';

const EMPTY: Partial<Venue> = { Name: '', Address: '', Capacity: 0, Status: 'Candidate', Cost: 0, PIC: '', Notes: '' };

export function VenueList() {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<Venue>('Venue');
  const { can } = usePermissions();
  const canEdit = can('Venue', 'Editor');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [form, setForm] = useState<Partial<Venue>>(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (v: Venue) => { setEditing(v); setForm(v); setOpen(true); };
  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create(form);
    setOpen(false);
  };
  const confirm = (v: Venue) => update(v.Id, { Status: 'Confirmed' as VenueStatus });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Venue</h2>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Candidate
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading venues…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((v) => (
            <div key={v.Id} className="rounded-xl border border-ink/10 bg-white p-4 space-y-1.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-guava" />
                  <p className="font-semibold text-sm">{v.Name}</p>
                </div>
                <Badge tone={v.Status === 'Confirmed' ? 'success' : 'warning'}>{v.Status}</Badge>
              </div>
              <p className="text-xs text-ink/60">{v.Address}</p>
              <p className="text-xs text-ink/50">Capacity: {v.Capacity} · Cost: {formatIDR(v.Cost)} · PIC: {v.PIC}</p>
              {canEdit && (
                <div className="flex gap-2 pt-2">
                  {v.Status !== 'Confirmed' && (
                    <Button size="sm" variant="secondary" onClick={() => confirm(v)}>
                      Mark Confirmed
                    </Button>
                  )}
                  <button onClick={() => openEdit(v)} className="text-ink/40 hover:text-ink">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(v.Id)} className="text-ink/40 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Venue' : 'Add Candidate Venue'}>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.Name ?? ''} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={form.Address ?? ''} onChange={(e) => setForm({ ...form, Address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity">
              <Input type="number" value={form.Capacity ?? 0} onChange={(e) => setForm({ ...form, Capacity: Number(e.target.value) })} />
            </Field>
            <Field label="Cost (IDR)">
              <Input type="number" value={form.Cost ?? 0} onChange={(e) => setForm({ ...form, Cost: Number(e.target.value) })} />
            </Field>
            <Field label="Status">
              <Select value={form.Status} onChange={(e) => setForm({ ...form, Status: e.target.value as VenueStatus })}>
                <option value="Candidate">Candidate</option>
                <option value="Confirmed">Confirmed</option>
              </Select>
            </Field>
            <Field label="PIC">
              <Input value={form.PIC ?? ''} onChange={(e) => setForm({ ...form, PIC: e.target.value })} />
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

function formatIDR(value?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
}
