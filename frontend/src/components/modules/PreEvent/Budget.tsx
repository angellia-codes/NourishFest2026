import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, Paperclip } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { AttachmentsPanel } from '@/components/documents/AttachmentsPanel';
import type { ApprovalStatus, BudgetItem, Phase } from '@/types';

const APPROVALS: ApprovalStatus[] = ['Pending', 'Approved', 'Rejected'];
const APPROVAL_TONE: Record<ApprovalStatus, 'warning' | 'success' | 'danger'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

const EMPTY: Partial<BudgetItem> = {
  ItemName: '',
  Category: '',
  Module: '',
  EstimatedCost: 0,
  ActualCost: 0,
  ApprovalStatus: 'Pending',
  PIC: '',
  Notes: '',
};

/** phase='Pre-Event' | 'Main Event' — Budget rows are shared, tagged by Phase */
export function BudgetTable({ phase, title }: { phase: Phase; title: string }) {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<BudgetItem>('Budget', { Phase: phase });
  const { can } = usePermissions();
  const canEdit = can('Budget', 'Editor');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState<Partial<BudgetItem>>(EMPTY);
  const [attachingItem, setAttachingItem] = useState<BudgetItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (item: BudgetItem) => {
    setEditing(item);
    setForm(item);
    setOpen(true);
  };
  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create({ ...form, Phase: phase });
    setOpen(false);
  };

  const totalEst = items.reduce((s, i) => s + Number(i.EstimatedCost || 0), 0);
  const totalActual = items.reduce((s, i) => s + Number(i.ActualCost || 0), 0);
  const variance = totalActual - totalEst;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Line Item
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Estimated" value={totalEst} />
        <SummaryCard label="Actual" value={totalActual} />
        <SummaryCard label="Variance" value={variance} highlight={variance > 0 ? 'danger' : 'success'} />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading budget…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3 text-right">Estimated</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3">Approval</th>
                <th className="px-4 py-3">PIC</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const v = Number(item.ActualCost || 0) - Number(item.EstimatedCost || 0);
                return (
                  <tr key={item.Id} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 font-medium">{item.ItemName}</td>
                    <td className="px-4 py-3 text-ink/60">{item.Module}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatIDR(item.EstimatedCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatIDR(item.ActualCost)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${v > 0 ? 'text-red-600' : 'text-jungle'}`}>
                      {v > 0 ? '+' : ''}
                      {formatIDR(v)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={APPROVAL_TONE[item.ApprovalStatus]}>{item.ApprovalStatus}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink/60">{item.PIC}</td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Line Item' : 'Add Line Item'}>
        <div className="space-y-3">
          <Field label="Item Name">
            <Input value={form.ItemName ?? ''} onChange={(e) => setForm({ ...form, ItemName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input value={form.Category ?? ''} onChange={(e) => setForm({ ...form, Category: e.target.value })} />
            </Field>
            <Field label="Module">
              <Input value={form.Module ?? ''} onChange={(e) => setForm({ ...form, Module: e.target.value })} placeholder="e.g. Entertainment" />
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
            <Field label="Approval Status">
              <Select
                value={form.ApprovalStatus}
                onChange={(e) => setForm({ ...form, ApprovalStatus: e.target.value as ApprovalStatus })}
              >
                {APPROVALS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
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
            <Button onClick={save} disabled={isMutating || !form.ItemName}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {attachingItem && (
        <AttachmentsPanel
          open={!!attachingItem}
          onClose={() => setAttachingItem(null)}
          linkedModule="Budget"
          linkedRecordId={attachingItem.Id}
          recordLabel={attachingItem.ItemName}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: 'success' | 'danger' }) {
  const color = highlight === 'danger' ? 'text-red-600' : highlight === 'success' ? 'text-jungle' : 'text-ink';
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`font-display text-xl font-semibold mt-1 ${color}`}>{formatIDR(value)}</p>
    </div>
  );
}

function formatIDR(value?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}
