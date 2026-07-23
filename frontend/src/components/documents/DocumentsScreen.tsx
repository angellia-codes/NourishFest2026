import { useState } from 'react';
import { ExternalLink, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Select } from '@/components/ui/Primitives';
import { UploadDocumentModal } from './UploadDocumentModal';
import { DOC_TYPES } from '@/types';

const TYPE_TONE: Record<string, 'brand' | 'warning' | 'info' | 'neutral' | 'danger'> = {
  Quotation: 'info',
  Invoice: 'warning',
  Contract: 'brand',
  Permit: 'neutral',
  Receipt: 'neutral',
  Other: 'neutral',
};

export function DocumentsScreen() {
  const [typeFilter, setTypeFilter] = useState('');
  const { items, isLoading, remove } = useDocuments(typeFilter ? { DocType: typeFilter } : {});
  const { can } = usePermissions();
  const canEdit = can('Documents', 'Editor');
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Documents</h2>
          <p className="text-sm text-ink/50">Vendor quotations, invoices, contracts, permits &amp; receipts filed for the record.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload Document
          </Button>
        )}
      </div>

      <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="!w-auto">
        <option value="">All types</option>
        {DOC_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink/40 py-10 text-center">No documents uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reference No.</th>
                <th className="px-4 py-3">Linked To</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <tr key={doc.Id} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-guava" /> {doc.Title}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TYPE_TONE[doc.DocType] ?? 'neutral'}>{doc.DocType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{doc.ReferenceNo || '—'}</td>
                  <td className="px-4 py-3 text-ink/60">
                    {doc.LinkedModule ? `${doc.LinkedModule}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{doc.UploadedBy}</td>
                  <td className="px-4 py-3 text-ink/60">{doc.UploadedAt?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <a href={doc.FileUrl} target="_blank" rel="noreferrer" className="text-ink/40 hover:text-guava inline-block">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {canEdit && (
                      <button onClick={() => remove(doc.Id)} className="text-ink/40 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadDocumentModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
