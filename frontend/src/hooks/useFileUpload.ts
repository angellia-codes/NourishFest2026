import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * Wraps the backend's single file upload — no metadata row, no
 * categorization, just "give me a file, get back a public URL" to store
 * directly into whichever `*FileLink`/`*ImageLink` field triggered it.
 *
 * The base64 conversion the Apps Script version needed is gone: Supabase
 * Storage takes the File as-is.
 */
export function useFileUpload() {
  const mutation = useMutation({
    mutationFn: (file: File) => api.uploadFile(file),
  });
  return { upload: mutation.mutateAsync, isUploading: mutation.isPending };
}
