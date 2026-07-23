import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { DOC_TYPES, type DocType } from '@/types';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // keep in sync with backend MAX_UPLOAD_BYTES

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill and lock the link to a specific record, e.g. a Budget or Roster row */
  linkedModule?: string;
  linkedRecordId?: string;
}

export function UploadDocumentModal({ open, onClose, linkedModule, linkedRecordId }: UploadDocumentModalProps) {
  const { upload, isUploading } = useDocuments();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>('Quotation');
  const [title, setTitle] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setFile(null);
    setTitle('');
    setReferenceNo('');
    setNotes('');
    setError('');
  };

  const handleFile = (f: File | null) => {
    setError('');
    if (f && f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    if (f && f.size > MAX_FILE_BYTES) {
      setError(`File too large — max ${MAX_FILE_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const submit = async () => {
    if (!file) return;
    try {
      await upload({
        file,
        DocType: docType,
        Title: title || file.name,
        ReferenceNo: referenceNo,
        LinkedModule: linkedModule ?? '',
        LinkedRecordId: linkedRecordId ?? '',
        Notes: notes,
      });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Document">
      <div className="space-y-3">
        <Field label="File (PDF, max 10MB)">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm rounded-lg border border-ink/15 bg-white px-3 py-2 file:mr-3 file:rounded-md file:border-0 file:bg-guava/10 file:text-guava file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
        </Field>
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Document Type">
            <Select value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference No. (vendor's own #)">
            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. INV-0042" />
          </Field>
        </div>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {linkedModule && (
          <p className="text-xs text-ink/40">Will be linked to this {linkedModule} record automatically.</p>
        )}
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!file || isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}
