import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useEntityData } from '@/hooks/useEntityData';
import type { Checklist, Event } from '@/types';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</p>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <p className="font-display text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading: dashLoading } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const { items: checklist, isLoading: checklistLoading } = useEntityData<Checklist>('Checklist');
  const { items: events } = useEntityData<Event>('Events');

  const isLoading = dashLoading || checklistLoading;

  const eventName = (eventId: string) => events.find((e) => e.EventID === eventId)?.EventName ?? '';

  const todo = [...checklist]
    .filter((t) => t.Status !== 'Done')
    .sort((a, b) => (a.DueDate || '9999').localeCompare(b.DueDate || '9999'))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-ink/50">A snapshot across all events.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatTile
              label="Days to Next Pre-Event"
              value={data?.daysToNextPreEvent != null ? String(data.daysToNextPreEvent) : '—'}
            />
            <StatTile
              label="Days to Main Event"
              value={data?.daysToMainEvent != null ? String(data.daysToMainEvent) : '—'}
            />
            <StatTile label="Overdue Checklist Tasks" value={String(data?.overdueChecklistCount ?? 0)} />
          </div>

          <Card title="Outstanding Tasks">
            {todo.length === 0 ? (
              <p className="text-sm text-ink/40">Nothing outstanding — nice work.</p>
            ) : (
              <div className="space-y-2">
                {todo.map((t) => (
                  <div key={t.TaskID} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{t.ToDo}</span>
                    <div className="flex items-center gap-2 shrink-0 text-ink/50 text-xs">
                      {eventName(t.EventID) && <span>{eventName(t.EventID)}</span>}
                      {t.DueDate && <span>due {t.DueDate}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
