import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { FileUploadField } from '@/components/shared/FileUploadField';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import type { ApprovalStatus, BudgetBreakdown, PaymentStatus } from '@/types';

export function BudgetPreEventScreen() {
  const { preEventId } = useSelectedEvent();
  return <BudgetTable eventId={preEventId} title="Budget — Pre-Event" />;
}

export function BudgetMainEventScreen() {
  const { mainEventId } = useSelectedEvent();
  return <BudgetTable eventId={mainEventId} title="Budget — Main Event" />;
}

const APPROVALS: ApprovalStatus[] = ['Pending', 'Approved', 'Rejected'];
const APPROVAL_TONE: Record<ApprovalStatus, 'warning' | 'success' | 'danger'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

const PAYMENTS: PaymentStatus[] = ['Unpaid', 'Partially Paid', 'Paid'];
const PAYMENT_TONE: Record<PaymentStatus, 'warning' | 'brand' | 'success'> = {
  Unpaid: 'warning',
  'Partially Paid': 'brand',
  Paid: 'success',
};

const CATEGORIES = [
  '🏢 Venue & Operations',
  '🍽️ Food, Beverage & Compliance',
  '📢 Marketing & Design',
  '🎤 Program & Production',
  '👥 Team Welfare & Engagement',
  '📦 Logistics & Administration',
];

function emptyForm(eventId: string): Partial<BudgetBreakdown> {
  return {
    EventID: eventId,
    ItemName: '',
    CategoryExpense: '',
    Description: '',
    EstimationCost: 0,
    VendorName: '',
    VendorPhone: '',
    QuotationFileLink: '',
    ApprovalStatus: 'Pending',
    ActualCost: 0,
    InvoiceFileLink: '',
    PaymentStatus: 'Unpaid',
  };
}

export function BudgetTable({ eventId, title }: { eventId: string | null; title: string }) {
  const { canWrite } = usePermissions();
  const canEdit = canWrite('BudgetBreakdown');

  if (!eventId) return <EventRequiredNotice />;

  return <BudgetTableInner eventId={eventId} title={title} canEdit={canEdit} />;
}

function BudgetTableInner({ eventId, title, canEdit }: { eventId: string; title: string; canEdit: boolean }) {
  const { items, isLoading, create, update, remove, isMutating } = useEntityData<BudgetBreakdown>('BudgetBreakdown', {
    eventId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetBreakdown | null>(null);
  const [form, setForm] = useState<Partial<BudgetBreakdown>>(emptyForm(eventId));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(eventId));
    setOpen(true);
  };
  const openEdit = (item: BudgetBreakdown) => {
    setEditing(item);
    setForm(item);
    setOpen(true);
  };
  const save = async () => {
    if (editing) await update(editing.BudgetID, form);
    else await create(form);
    setOpen(false);
  };

  const totalEst = items.reduce((s, i) => s + Number(i.EstimationCost || 0), 0);
  const totalActual = items.reduce((s, i) => s + Number(i.ActualCost || 0), 0);
  const totalVariance = items.reduce((s, i) => s + Number(i.Variance || 0), 0);

  const isApproved = form.ApprovalStatus === 'Approved';

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
        <SummaryCard label="Variance" value={totalVariance} highlight={totalVariance > 0 ? 'danger' : 'success'} />
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
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Estimated</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3">Approval</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Vendor</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const approved = item.ApprovalStatus === 'Approved';
                const variance = Number(item.Variance || 0);
                return (
                  <tr key={item.BudgetID} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 font-medium">{item.ItemName}</td>
                    <td className="px-4 py-3 text-ink/60">{item.CategoryExpense}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatIDR(item.EstimationCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{approved ? formatIDR(item.ActualCost) : '—'}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${variance > 0 ? 'text-red-600' : 'text-jungle'}`}>
                      {approved ? formatIDR(item.Variance) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={APPROVAL_TONE[item.ApprovalStatus]}>{item.ApprovalStatus}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {approved ? <Badge tone={PAYMENT_TONE[item.PaymentStatus]}>{item.PaymentStatus}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink/60">{[item.VendorName, item.VendorPhone].filter(Boolean).join(' / ')}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <button onClick={() => openEdit(item)} className="text-ink/40 hover:text-ink">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(item.BudgetID)} className="text-ink/40 hover:text-red-600">
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
              <Select value={form.CategoryExpense ?? ''} onChange={(e) => setForm({ ...form, CategoryExpense: e.target.value })}>
                <option value="">— select —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estimated Cost (IDR)">
              <Input
                type="number"
                value={form.EstimationCost ?? 0}
                onChange={(e) => setForm({ ...form, EstimationCost: Number(e.target.value) })}
              />
            </Field>
            <Field label="Vendor Name">
              <Input value={form.VendorName ?? ''} onChange={(e) => setForm({ ...form, VendorName: e.target.value })} />
            </Field>
            <Field label="Vendor Phone">
              <Input value={form.VendorPhone ?? ''} onChange={(e) => setForm({ ...form, VendorPhone: e.target.value })} />
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
            <Field label="Quotation">
              <FileUploadField
                value={form.QuotationFileLink ?? ''}
                onChange={(url) => setForm({ ...form, QuotationFileLink: url })}
              />
            </Field>
          </div>

          {isApproved && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink/10">
              <Field label="Actual Cost (IDR)">
                <Input
                  type="number"
                  value={form.ActualCost ?? 0}
                  onChange={(e) => setForm({ ...form, ActualCost: Number(e.target.value) })}
                />
              </Field>
              <Field label="Payment Status">
                <Select
                  value={form.PaymentStatus}
                  onChange={(e) => setForm({ ...form, PaymentStatus: e.target.value as PaymentStatus })}
                >
                  {PAYMENTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Invoice">
                <FileUploadField
                  value={form.InvoiceFileLink ?? ''}
                  onChange={(url) => setForm({ ...form, InvoiceFileLink: url })}
                />
              </Field>
              {editing && (
                <div className="text-xs text-ink/40 self-end pb-2">
                  Variance (auto-computed): {formatIDR(editing.Variance)}
                </div>
              )}
            </div>
          )}

          <Field label="Description">
            <Textarea value={form.Description ?? ''} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
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

function formatIDR(value?: number | string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}
