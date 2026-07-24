import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useAIGenerate() {
  const mutation = useMutation({
    mutationFn: (input: { kind: 'theme' | 'tagline' | 'idea'; prompt: string }) =>
      api.aiGenerate(input.kind, input.prompt),
  });
  return {
    generate: mutation.mutateAsync,
    suggestions: mutation.data?.suggestions ?? [],
    isGenerating: mutation.isPending,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}
