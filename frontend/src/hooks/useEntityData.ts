import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ID_FIELD, type EntityName } from '../types';

const POLL_INTERVAL_MS = 30_000; // auto-refresh every 30s, per module decision

/**
 * Generic CRUD + polling hook for any entity the backend exposes via
 * `?action=list&entity=...`. Used by every module instead of a bespoke hook
 * per entity.
 *
 *   const { items, isLoading, create, update, remove } =
 *     useEntityData<Committee>('Committee');
 *
 *   const { items } = useEntityData<BudgetBreakdown>('BudgetBreakdown', { eventId });
 *
 * `eventId` is the only server-side filter the backend supports — anything
 * else (Status, ApprovalStatus, etc.) must be filtered client-side by the
 * caller after the fact.
 */
export function useEntityData<T extends object>(
  entity: EntityName,
  opts: { eventId?: string } = {},
) {
  const qc = useQueryClient();
  const queryKey = [entity, opts.eventId ?? null] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => api.list<T>(entity, opts.eventId),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [entity] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<T>) => api.create<T>(entity, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => api.update<T>(entity, id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove(entity, id),
    onSuccess: invalidate,
  });

  return {
    items: query.data ?? [],
    idField: ID_FIELD[entity] as keyof T & string,
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
