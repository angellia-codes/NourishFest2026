import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Select } from '@/components/ui/Primitives';
import type { Event, EventTypeValue } from '@/types';

const EVENT_TYPES: EventTypeValue[] = ['PreEvent', 'MainEvent'];
const MONTHS = ['August', 'September', 'October', 'November', 'December'];
const STATUSES = ['Planned', 'Confirmed', 'Completed', 'Cancelled'];

const EMPTY: Partial<Event> = {
  EventType: 'PreEvent',
  Month: '',
  EventName: '',
  CategoryOrTheme: '',
  Purpose: '',
  Tagline: '',
  Date: '',
  Location: '',
  Status: 'Planned',
};

/** Admin-only. Nothing else in the app has data to show until Events exist here. */
export function EventManagement() {
  const { items, isLoading, create, update, remove, isMutating } = useEntityData<Event>('Events');
  const { canWrite } = usePermissions();
  const canEdit = canWrite('Events');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<Partial<Event>>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<Event | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (ev: Event) => {
    setEditing(ev);
    setForm(ev);
    setOpen(true);
  };
  const save = async () => {
    if (editing) await update(editing.EventID, form);
    else await create(form);
    setOpen(false);
  };
  const confirmAndRemove = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete.EventID);
    setConfirmDelete(null);
  };

  const sorted = [...items].sort((a, b) => (a.Date || '').localeCompare(b.Date || ''));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Event Management</h2>
          <p className="text-sm text-ink/50">
            Create the 4 Pre-Event months and the Main Event — every other screen attaches to one of these.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-ink/40 py-10 text-center">No events yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Type / Month</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((ev) => (
                <tr key={ev.EventID} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 font-medium">{ev.EventName}</td>
                  <td className="px-4 py-3 text-ink/60">
                    {ev.EventType === 'MainEvent' ? 'Main Event' : `Pre-Event · ${ev.Month}`}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{ev.Date}</td>
                  <td className="px-4 py-3 text-ink/60">{ev.Location}</td>
                  <td className="px-4 py-3 text-ink/60">{ev.Status}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => openEdit(ev)} className="text-ink/40 hover:text-ink">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(ev)} className="text-ink/40 hover:text-red-600">
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Event' : 'Add Event'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Event Type">
              <Select
                value={form.EventType}
                onChange={(e) => setForm({ ...form, EventType: e.target.value as EventTypeValue })}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'MainEvent' ? 'Main Event' : 'Pre-Event'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Month">
              <Select
                value={form.Month ?? ''}
                onChange={(e) => setForm({ ...form, Month: e.target.value })}
                disabled={form.EventType === 'MainEvent'}
              >
                <option value="">— select —</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Event Name">
            <Input value={form.EventName ?? ''} onChange={(e) => setForm({ ...form, EventName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category / Theme">
              <Input
                value={form.CategoryOrTheme ?? ''}
                onChange={(e) => setForm({ ...form, CategoryOrTheme: e.target.value })}
              />
            </Field>
            <Field label="Tagline">
              <Input value={form.Tagline ?? ''} onChange={(e) => setForm({ ...form, Tagline: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.Date ?? ''} onChange={(e) => setForm({ ...form, Date: e.target.value })} />
            </Field>
            <Field label="Location">
              <Input value={form.Location ?? ''} onChange={(e) => setForm({ ...form, Location: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.Status ?? ''} onChange={(e) => setForm({ ...form, Status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Purpose">
            <Input value={form.Purpose ?? ''} onChange={(e) => setForm({ ...form, Purpose: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isMutating || !form.EventName}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Event?">
        <div className="space-y-3">
          <p className="text-sm text-ink/70">
            Deleting <strong>{confirmDelete?.EventName}</strong> does not remove Budget, Checklist, or other rows
            still referencing this event — those will be orphaned. Continue?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmAndRemove}>
              Delete anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
