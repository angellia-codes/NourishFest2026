import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

const POLL_INTERVAL_MS = 30_000; // auto-refresh every 30s, per module decision

/**
 * Generic CRUD + polling hook for any sheet-backed entity.
 * Used by every module — Ideas, Committee, Budget, Roster, etc. — instead of
 * writing a bespoke hook per sheet.
 *
 *   const { items, isLoading, create, update, remove } =
 *     useSheetData<Idea>('Ideas');
 *
 *   const { items } = useSheetData<RosterItem>('Roster', { Module: 'Entertainment' });
 */
export function useSheetData<T extends { Id: string }>(
  sheet: string,
  filters: Record<string, string> = {},
) {
  const qc = useQueryClient();
  const queryKey = [sheet, filters] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => api.list<T>(sheet, filters),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [sheet] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<T>) => api.create<T>(sheet, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => api.update<T>(sheet, id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove(sheet, id),
    onSuccess: invalidate,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: (id: string, data: Partial<T>) => updateMutation.mutateAsync({ id, data }),
    remove: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
