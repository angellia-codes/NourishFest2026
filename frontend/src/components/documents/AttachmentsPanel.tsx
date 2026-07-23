import { useState } from 'react';
import { ExternalLink, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Modal } from '@/components/ui/Primitives';
import { UploadDocumentModal } from './UploadDocumentModal';

interface AttachmentsPanelProps {
  open: boolean;
  onClose: () => void;
  linkedModule: string; // 'Budget' | 'Roster' | ...
  linkedRecordId: string;
  recordLabel: string; // shown in the modal title, e.g. the item's Name
}

const TYPE_TONE: Record<string, 'brand' | 'warning' | 'info' | 'neutral' | 'danger'> = {
  Quotation: 'info',
  Invoice: 'warning',
  Contract: 'brand',
  Permit: 'neutral',
  Receipt: 'neutral',
  Other: 'neutral',
};

export function AttachmentsPanel({ open, onClose, linkedModule, linkedRecordId, recordLabel }: AttachmentsPanelProps) {
  const { items, isLoading, remove } = useDocuments({ LinkedModule: linkedModule, LinkedRecordId: linkedRecordId });
  const { can } = usePermissions();
  const canEdit = can('Documents', 'Editor');
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={`Attachments — ${recordLabel}`}>
      <div className="space-y-3">
        {canEdit && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Upload Document
          </Button>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-ink/50 text-sm py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading attachments…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/40 py-6 text-center">No documents attached yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((doc) => (
              <div key={doc.Id} className="flex items-center justify-between gap-2 rounded-lg border border-ink/10 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-guava shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.Title}</p>
                    <p className="text-xs text-ink/40">
                      {doc.ReferenceNo && `${doc.ReferenceNo} · `}
                      {doc.UploadedBy}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={TYPE_TONE[doc.DocType] ?? 'neutral'}>{doc.DocType}</Badge>
                  <a href={doc.FileUrl} target="_blank" rel="noreferrer" className="text-ink/40 hover:text-guava">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {canEdit && (
                    <button onClick={() => remove(doc.Id)} className="text-ink/40 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        linkedModule={linkedModule}
        linkedRecordId={linkedRecordId}
      />
    </Modal>
  );
}
