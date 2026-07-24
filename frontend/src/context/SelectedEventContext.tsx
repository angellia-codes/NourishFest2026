import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEntityData } from '../hooks/useEntityData';
import type { Event } from '../types';

interface SelectedEventContextValue {
  events: Event[];
  isLoading: boolean;
  /** Pre-Event's 4 monthly events, sorted by Date. */
  preEvents: Event[];
  preEventId: string | null;
  setPreEventId: (id: string) => void;
  /** Auto-resolved — there's exactly one Main Event record, so no picker is needed. */
  mainEventId: string | null;
}

const SelectedEventContext = createContext<SelectedEventContextValue | null>(null);

export function SelectedEventProvider({ children }: { children: ReactNode }) {
  const { items: events, isLoading } = useEntityData<Event>('Events');
  const [preEventId, setPreEventId] = useState<string | null>(null);

  const preEvents = useMemo(
    () =>
      events
        .filter((e) => e.EventType === 'PreEvent')
        .sort((a, b) => (a.Date || '').localeCompare(b.Date || '')),
    [events],
  );

  const mainEventId = events.find((e) => e.EventType === 'MainEvent')?.EventID ?? null;

  useEffect(() => {
    if (!preEventId && preEvents.length > 0) setPreEventId(preEvents[0].EventID);
  }, [preEvents, preEventId]);

  return (
    <SelectedEventContext.Provider value={{ events, isLoading, preEvents, preEventId, setPreEventId, mainEventId }}>
      {children}
    </SelectedEventContext.Provider>
  );
}

export function useSelectedEvent() {
  const ctx = useContext(SelectedEventContext);
  if (!ctx) throw new Error('useSelectedEvent must be used within <SelectedEventProvider>');
  return ctx;
}
