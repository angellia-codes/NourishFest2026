import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, Presentation, Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { ProposalPdfDocument } from '@/components/pdf/ProposalPdfDocument';
import type { ProposalItem, ProposalType } from '@/types';

const EMPTY: Partial<ProposalItem> = { Type: 'Sponsorship', Title: '', Description: '', Price: 0, Benefits: '', DisplayOrder: 0 };

export function ProposalEditor() {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<ProposalItem>('Proposal');
  const { can } = usePermissions();
  const canEdit = can('Proposal', 'Editor');

  const [presentMode, setPresentMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalItem | null>(null);
  const [form, setForm] = useState<Partial<ProposalItem>>(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (p: ProposalItem) => { setEditing(p); setForm(p); setOpen(true); };
  const save = async () => {
    if (editing) await update(editing.Id, form);
    else await create(form);
    setOpen(false);
  };

  const sorted = [...items].sort((a, b) => Number(a.DisplayOrder) - Number(b.DisplayOrder));
  const overview = sorted.filter((i) => i.Type === 'Overview');
  const tiers = sorted.filter((i) => i.Type === 'Sponsorship');

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const downloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const blob = await pdf(<ProposalPdfDocument overview={overview} tiers={tiers} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NourishFest-2026-Proposal.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (presentMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setPresentMode(false)}>
            Exit presentation view
          </Button>
          <Button onClick={downloadPdf} disabled={generatingPdf}>
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
          </Button>
        </div>
        {overview.map((o) => (
          <div key={o.Id} className="space-y-2">
            <h1 className="font-display text-4xl font-bold bg-festival-gradient bg-clip-text text-transparent">{o.Title}</h1>
            <p className="text-ink/70 whitespace-pre-line">{o.Description}</p>
          </div>
        ))}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((t) => (
            <div key={t.Id} className="rounded-2xl border-2 border-guava/20 bg-white p-6 space-y-3">
              <h3 className="font-display text-xl font-semibold">{t.Title}</h3>
              <p className="text-2xl font-bold text-guava">{formatIDR(t.Price)}</p>
              <ul className="text-sm text-ink/70 space-y-1 list-disc pl-4">
                {t.Benefits.split('\n').filter(Boolean).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Proposal</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setPresentMode(true)}>
            <Presentation className="h-4 w-4" /> Presentation View
          </Button>
          <Button variant="secondary" onClick={downloadPdf} disabled={generatingPdf || tiers.length === 0}>
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
          </Button>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Section
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading proposal…
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <div key={item.Id} className="rounded-xl border border-ink/10 bg-white p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/40">{item.Type}</p>
                <p className="font-semibold text-sm">{item.Title}{item.Type === 'Sponsorship' && ` — ${formatIDR(item.Price)}`}</p>
                <p className="text-sm text-ink/60 whitespace-pre-line">{item.Description}</p>
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="text-ink/40 hover:text-ink">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(item.Id)} className="text-ink/40 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Section' : 'Add Section'}>
        <div className="space-y-3">
          <Field label="Type">
            <Select value={form.Type} onChange={(e) => setForm({ ...form, Type: e.target.value as ProposalType })}>
              <option value="Overview">Overview</option>
              <option value="Sponsorship">Sponsorship Tier</option>
            </Select>
          </Field>
          <Field label="Title">
            <Input value={form.Title ?? ''} onChange={(e) => setForm({ ...form, Title: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={form.Description ?? ''} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
          </Field>
          {form.Type === 'Sponsorship' && (
            <>
              <Field label="Price (IDR)">
                <Input type="number" value={form.Price ?? 0} onChange={(e) => setForm({ ...form, Price: Number(e.target.value) })} />
              </Field>
              <Field label="Benefits (one per line)">
                <Textarea value={form.Benefits ?? ''} onChange={(e) => setForm({ ...form, Benefits: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Display Order">
            <Input type="number" value={form.DisplayOrder ?? 0} onChange={(e) => setForm({ ...form, DisplayOrder: Number(e.target.value) })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isMutating || !form.Title}>
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
