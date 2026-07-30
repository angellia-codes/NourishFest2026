import { useQuery } from '@tanstack/react-query';
import { Loader2, Calendar, MapPin } from 'lucide-react';
import { api } from '@/services/api';
import { useEntityData } from '@/hooks/useEntityData';
import type { BudgetBreakdown, Checklist, Event } from '@/types';

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

function formatIDR(value?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value ?? 0),
  );
}

/** Days from today to `date`, or null if it isn't a YYYY-MM-DD — mirrors safe_date() in schema.sql. */
function daysUntil(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!m) return null;
  const then = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); // local midnight, not UTC
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - today.getTime()) / 86_400_000);
}

function countdown(days: number | null) {
  if (days === null) return { text: '— no date —', tone: 'text-ink/40' };
  if (days === 0) return { text: 'today', tone: 'text-jungle font-semibold' };
  if (days > 0) return { text: `in ${days} day${days === 1 ? '' : 's'}`, tone: 'text-ink/60' };
  return { text: `${-days} day${days === -1 ? '' : 's'} ago`, tone: 'text-ink/40' };
}

function EventCard({ event, budget }: { event: Event; budget: number }) {
  const { text, tone } = countdown(daysUntil(event.Date));
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 space-y-1.5">
      <p className="font-semibold text-sm">{event.EventName || event.Month || '— unnamed —'}</p>
      <p className="flex items-center gap-1.5 text-xs text-ink/50">
        <Calendar className="h-3 w-3 shrink-0" /> {event.Date || '—'}
        <span className={tone}>· {text}</span>
      </p>
      <p className="flex items-center gap-1.5 text-xs text-ink/50">
        <MapPin className="h-3 w-3 shrink-0" /> {event.Location || '— no location —'}
      </p>
      <p className="pt-1 text-xs text-ink/50">
        Est. budget <span className="font-medium text-ink tabular-nums">{formatIDR(budget)}</span>
      </p>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading: dashLoading } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const { items: checklist, isLoading: checklistLoading } = useEntityData<Checklist>('Checklist');
  const { items: events } = useEntityData<Event>('Events');
  const { items: budget, isLoading: budgetLoading } = useEntityData<BudgetBreakdown>('BudgetBreakdown');

  const isLoading = dashLoading || checklistLoading || budgetLoading;

  const eventName = (eventId: string) => events.find((e) => e.EventID === eventId)?.EventName ?? '';

  const budgetByEvent = budget.reduce<Record<string, number>>((acc, b) => {
    acc[b.EventID] = (acc[b.EventID] ?? 0) + Number(b.EstimationCost || 0);
    return acc;
  }, {});

  const byDate = (a: Event, b: Event) => (a.Date || '').localeCompare(b.Date || '');
  const preEvents = events.filter((e) => e.EventType === 'PreEvent').sort(byDate);
  const mainEvents = events.filter((e) => e.EventType === 'MainEvent').sort(byDate);

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

          {[
            { title: 'Road to NourishFest', list: preEvents },
            { title: 'NourishFest', list: mainEvents },
          ].map(
            ({ title, list }) =>
              list.length > 0 && (
                <div key={title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {list.map((e) => (
                      <EventCard key={e.EventID} event={e} budget={budgetByEvent[e.EventID] ?? 0} />
                    ))}
                  </div>
                </div>
              ),
          )}

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
