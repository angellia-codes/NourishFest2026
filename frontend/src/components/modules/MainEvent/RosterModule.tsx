import { useState } from 'react';
import { Plus, Trash2, Pencil, Loader2, Paperclip } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Textarea } from '@/components/ui/Primitives';
import { AttachmentsPanel } from '@/components/documents/AttachmentsPanel';
import { AIPromptBox } from '@/components/ai/AIPromptBox';
import { AIImagePanel } from '@/components/ai/AIImagePanel';
import type { RosterItem, RosterModule as RosterModuleName } from '@/types';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
  Confirmed: 'success',
  Booked: 'success',
  Pending: 'warning',
};

const EMPTY: Partial<RosterItem> = {
  Name: '',
  Category: '',
  PIC: '',
  Vendor: '',
  EstimatedCost: 0,
  ActualCost: 0,
  Status: 'Pending',
  Notes: '',
};

/**
 * Generic table CRUD screen for the 7 roster-style Main Event sub-modules.
 * All 7 share the same shape (see backend/SCHEMA.md `Roster` tab) so this
 * one component + a `moduleName` prop replaces 7 near-duplicate screens.
 */
export function RosterModuleScreen({ moduleName, title }: { moduleName: RosterModuleName; title: string }) {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<RosterItem>('Roster', {
    Module: moduleName,
  });
  const { can } = usePermissions();
  const canEdit = can('Roster', 'Editor');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RosterItem | null>(null);
  const [form, setForm] = useState<Partial<RosterItem>>(EMPTY);
  const [attachingItem, setAttachingItem] = useState<RosterItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, Module: moduleName });
    setOpen(true);
  };

  const addAiConcept = (suggestion: string) => {
    setEditing(null);
    setForm({ ...EMPTY, Module: moduleName, Name: suggestion });
    setOpen(true);
  };

  const openEdit = (item: RosterItem) => {
    setEditing(item);
    setForm(item);
    setOpen(true);
  };

  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create({ ...form, Module: moduleName });
    setOpen(false);
  };

  const totalEst = items.reduce((sum, i) => sum + Number(i.EstimatedCost || 0), 0);
  const totalActual = items.reduce((sum, i) => sum + Number(i.ActualCost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-ink/50">
            Est. {formatIDR(totalEst)} · Actual {formatIDR(totalActual)}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add {title.slice(0, -1) || title}
          </Button>
        )}
      </div>

      {moduleName === 'Decoration' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AIPromptBox
            kind="decoration"
            label="AI decoration concepts"
            placeholder="e.g. beachside, sunset colors, bamboo…"
            onPick={addAiConcept}
          />
          <AIImagePanel kind="decoration" label="AI moodboard image" linkedModule="Roster" />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {title}…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink/40 py-10 text-center">No {title.toLowerCase()} entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">PIC / Vendor</th>
                <th className="px-4 py-3 text-right">Est. Cost</th>
                <th className="px-4 py-3 text-right">Actual Cost</th>
                <th className="px-4 py-3">Status</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.Id} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 font-medium">{item.Name}</td>
                  <td className="px-4 py-3 text-ink/70">{item.Category}</td>
                  <td className="px-4 py-3 text-ink/70">{[item.PIC, item.Vendor].filter(Boolean).join(' / ')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatIDR(item.EstimatedCost)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatIDR(item.ActualCost)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[item.Status] ?? 'neutral'}>{item.Status}</Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => setAttachingItem(item)} className="text-ink/40 hover:text-guava" title="Attachments">
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(item)} className="text-ink/40 hover:text-ink">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(item.Id)} className="text-ink/40 hover:text-red-600">
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${title.slice(0, -1)}` : `Add ${title}`}>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.Name ?? ''} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input value={form.Category ?? ''} onChange={(e) => setForm({ ...form, Category: e.target.value })} />
            </Field>
            <Field label="Status">
              <Input value={form.Status ?? ''} onChange={(e) => setForm({ ...form, Status: e.target.value })} />
            </Field>
            <Field label="PIC">
              <Input value={form.PIC ?? ''} onChange={(e) => setForm({ ...form, PIC: e.target.value })} />
            </Field>
            <Field label="Vendor">
              <Input value={form.Vendor ?? ''} onChange={(e) => setForm({ ...form, Vendor: e.target.value })} />
            </Field>
            <Field label="Estimated Cost (IDR)">
              <Input
                type="number"
                value={form.EstimatedCost ?? 0}
                onChange={(e) => setForm({ ...form, EstimatedCost: Number(e.target.value) })}
              />
            </Field>
            <Field label="Actual Cost (IDR)">
              <Input
                type="number"
                value={form.ActualCost ?? 0}
                onChange={(e) => setForm({ ...form, ActualCost: Number(e.target.value) })}
              />
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

      {attachingItem && (
        <AttachmentsPanel
          open={!!attachingItem}
          onClose={() => setAttachingItem(null)}
          linkedModule="Roster"
          linkedRecordId={attachingItem.Id}
          recordLabel={attachingItem.Name}
        />
      )}
    </div>
  );
}

function formatIDR(value?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}
