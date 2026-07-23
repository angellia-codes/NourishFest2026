import { Loader2 } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { Badge } from '@/components/ui/Primitives';
import type { BudgetItem, ChecklistTask, Phase, Priority } from '@/types';

const PHASES: Phase[] = ['Pre-Event', 'Main Event'];

const PRIORITY_TONE: Record<Priority, 'neutral' | 'info' | 'warning' | 'danger'> = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
};

function money(n: number) {
  return 'IDR' + (n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function ProgressBar({ pct }: { pct: number }) {
  const tone = pct >= 100 ? 'bg-jungle' : pct >= 50 ? 'bg-guava' : 'bg-sun';
  return (
    <div className="h-2 rounded-full bg-ink/8 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</p>
      {children}
    </div>
  );
}

export function Dashboard() {
  const budget = useSheetData<BudgetItem>('Budget');
  const checklist = useSheetData<ChecklistTask>('Checklist');

  const isLoading = budget.isLoading || checklist.isLoading;

  const todo = [...checklist.items]
    .filter((c) => c.Status !== 'Done')
    .sort((a, b) => (a.Deadline || '9999').localeCompare(b.Deadline || '9999'))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-ink/50">A snapshot across Budget and Checklist.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Budget">
            <div className="space-y-3">
              {PHASES.map((phase) => {
                const rows = budget.items.filter((b) => b.Phase === phase);
                const estimated = rows.reduce((s, r) => s + Number(r.EstimatedCost || 0), 0);
                const actual = rows.reduce((s, r) => s + Number(r.ActualCost || 0), 0);
                const pct = estimated > 0 ? (actual / estimated) * 100 : 0;
                return (
                  <div key={phase} className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{phase}</span>
                      <span className="text-ink/50">
                        {money(actual)} / {money(estimated)}
                      </span>
                    </div>
                    <ProgressBar pct={pct} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Checklist Progress">
            <div className="space-y-3">
              {PHASES.map((phase) => {
                const rows = checklist.items.filter((c) => c.Phase === phase);
                const done = rows.filter((c) => c.Status === 'Done').length;
                const pct = rows.length > 0 ? (done / rows.length) * 100 : 0;
                return (
                  <div key={phase} className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{phase}</span>
                      <span className="text-ink/50">
                        {done} / {rows.length} done
                      </span>
                    </div>
                    <ProgressBar pct={pct} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="To-Do">
            {todo.length === 0 ? (
              <p className="text-sm text-ink/40">Nothing outstanding — nice work.</p>
            ) : (
              <div className="space-y-2">
                {todo.map((t) => (
                  <div key={t.Id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{t.Task}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.Deadline && <span className="text-ink/50 text-xs">{t.Deadline}</span>}
                      <Badge tone={PRIORITY_TONE[t.Priority] ?? 'neutral'}>{t.Priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
