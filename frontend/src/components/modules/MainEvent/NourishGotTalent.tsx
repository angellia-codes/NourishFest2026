import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, Star } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Textarea } from '@/components/ui/Primitives';
import type { TalentEntry } from '@/types';

const EMPTY: Partial<TalentEntry> = {
  ParticipantName: '', Outlet: '', Category: '', PerformanceOrder: 0, Score: 0, JudgeNotes: '', Status: 'Registered',
};

export function NourishGotTalentBoard() {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<TalentEntry>('NourishGotTalent');
  const { can } = usePermissions();
  const canEdit = can('NourishGotTalent', 'Editor');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TalentEntry | null>(null);
  const [form, setForm] = useState<Partial<TalentEntry>>(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (t: TalentEntry) => { setEditing(t); setForm(t); setOpen(true); };
  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create(form);
    setOpen(false);
  };

  const sorted = [...items].sort((a, b) => Number(a.PerformanceOrder) - Number(b.PerformanceOrder));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Nourish Got Talent</h2>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Participant
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading lineup…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Outlet</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.Id} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 text-ink/50">{t.PerformanceOrder}</td>
                  <td className="px-4 py-3 font-medium">{t.ParticipantName}</td>
                  <td className="px-4 py-3 text-ink/60">{t.Outlet}</td>
                  <td className="px-4 py-3 text-ink/60">{t.Category}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-mango font-medium">
                      <Star className="h-3.5 w-3.5 fill-mango" /> {t.Score || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{t.Status}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => openEdit(t)} className="text-ink/40 hover:text-ink">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(t.Id)} className="text-ink/40 hover:text-red-600">
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
          <Field label="Participant Name">
            <Input value={form.ParticipantName ?? ''} onChange={(e) => setForm({ ...form, ParticipantName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Outlet">
              <Input value={form.Outlet ?? ''} onChange={(e) => setForm({ ...form, Outlet: e.target.value })} />
            </Field>
            <Field label="Category">
              <Input value={form.Category ?? ''} onChange={(e) => setForm({ ...form, Category: e.target.value })} />
            </Field>
            <Field label="Performance Order">
              <Input type="number" value={form.PerformanceOrder ?? 0} onChange={(e) => setForm({ ...form, PerformanceOrder: Number(e.target.value) })} />
            </Field>
            <Field label="Score">
              <Input type="number" value={form.Score ?? 0} onChange={(e) => setForm({ ...form, Score: Number(e.target.value) })} />
            </Field>
            <Field label="Status">
              <Input value={form.Status ?? ''} onChange={(e) => setForm({ ...form, Status: e.target.value })} placeholder="Registered / Performed / Finalist" />
            </Field>
          </div>
          <Field label="Judge Notes">
            <Textarea value={form.JudgeNotes ?? ''} onChange={(e) => setForm({ ...form, JudgeNotes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isMutating || !form.ParticipantName}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
