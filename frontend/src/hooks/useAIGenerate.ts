import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { AIKind, DocumentRecord } from '@/types';

export function useAIText() {
  const mutation = useMutation({
    mutationFn: (input: { kind: AIKind; prompt: string }) => api.aiGenerateText(input),
  });
  return {
    generate: mutation.mutateAsync,
    suggestions: mutation.data?.suggestions ?? [],
    isGenerating: mutation.isPending,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}

export function useAIImage() {
  const mutation = useMutation({
    mutationFn: (input: { kind: AIKind; prompt: string }) => api.aiGenerateImage(input),
  });
  return {
    generate: mutation.mutateAsync,
    image: mutation.data ?? null, // { imageBase64, mimeType }
    isGenerating: mutation.isPending,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}

/** Saves an already-generated image (base64 in hand) straight to the Documents vault as DocType='Design'. */
export function useSaveGeneratedImage() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: {
      imageBase64: string;
      mimeType: string;
      title: string;
      linkedModule?: string;
      linkedRecordId?: string;
    }) =>
      api.uploadDocument<DocumentRecord>({
        DocType: 'Design',
        Title: input.title,
        FileName: input.title.replace(/\s+/g, '-').toLowerCase() + '.png',
        MimeType: input.mimeType,
        FileBase64: input.imageBase64,
        LinkedModule: input.linkedModule ?? '',
        LinkedRecordId: input.linkedRecordId ?? '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['Documents'] }),
  });
  return { save: mutation.mutateAsync, isSaving: mutation.isPending };
}
