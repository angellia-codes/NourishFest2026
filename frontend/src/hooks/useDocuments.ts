import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSheetData } from './useSheetData';
import type { DocumentRecord } from '@/types';

export interface UploadDocumentInput {
  file: File;
  DocType: string;
  Title: string;
  ReferenceNo?: string;
  LinkedModule?: string;
  LinkedRecordId?: string;
  Notes?: string;
}

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
 * filters: e.g. { LinkedModule: 'Budget', LinkedRecordId: budgetItem.Id }
 * to scope the list to attachments for one specific row, or {} for the
 * full Documents vault.
 */
export function useDocuments(filters: Record<string, string> = {}) {
  const base = useSheetData<DocumentRecord>('Documents', filters);
  const qc = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (input: UploadDocumentInput) => {
      const FileBase64 = await fileToBase64(input.file);
      return api.uploadDocument<DocumentRecord>({
        DocType: input.DocType,
        Title: input.Title,
        FileName: input.file.name,
        MimeType: input.file.type || 'application/pdf',
        FileBase64,
        ReferenceNo: input.ReferenceNo,
        LinkedModule: input.LinkedModule,
        LinkedRecordId: input.LinkedRecordId,
        Notes: input.Notes,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['Documents'] }),
  });

  return {
    ...base,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error as Error | null,
  };
}
