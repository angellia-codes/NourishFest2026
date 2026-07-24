import { Loader2, Paperclip, ExternalLink } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

/** Replaces the old Documents vault: pick a file, get back a Drive URL, store it inline on the record. */
export function FileUploadField({ value, onChange, disabled }: FileUploadFieldProps) {
  const { upload, isUploading } = useFileUpload();

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await upload(file);
    onChange(result.url);
  };

  return (
    <div className="flex items-center gap-2">
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-guava hover:underline truncate max-w-[9rem]"
        >
          <ExternalLink className="h-3 w-3 shrink-0" /> View file
        </a>
      )}
      {!disabled && (
        <label className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-ink/15 bg-white cursor-pointer hover:bg-paper/60 shrink-0">
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {value ? 'Replace' : 'Upload'}
          <input type="file" className="hidden" onChange={pick} disabled={isUploading} />
        </label>
      )}
    </div>
  );
}
