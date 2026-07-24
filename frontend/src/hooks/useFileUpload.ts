import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // FileReader result is "data:<mime>;base64,<data>" — strip the prefix
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Wraps the backend's single `uploadFile` action — no metadata row, no
 * categorization, just "give me a file, get back a Drive view-link URL" to
 * store directly into whichever `*FileLink`/`*ImageLink` field triggered it.
 */
export function useFileUpload() {
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file);
      return api.uploadFile({ base64, filename: file.name, mimeType: file.type || 'application/octet-stream' });
    },
  });
  return { upload: mutation.mutateAsync, isUploading: mutation.isPending };
}
