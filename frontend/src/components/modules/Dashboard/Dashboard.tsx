import { Loader2 } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import type { BudgetItem, ChecklistTask, Phase, RundownItem } from '@/types';

const PHASES: Phase[] = ['Pre-Event', 'Main Event'];

function money(n: number) {
  return 'RM ' + (n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
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
  const rundown = useSheetData<RundownItem>('Rundown');

  const isLoading = budget.isLoading || checklist.isLoading || rundown.isLoading;

  const upcoming = [...rundown.items].sort((a, b) => a.TimeStart.localeCompare(b.TimeStart)).slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-ink/50">A snapshot across Budget, Checklist and Rundown.</p>
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

          <Card title="Up Next — Rundown">
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink/40">No rundown segments yet.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((r) => (
                  <div key={r.Id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.Segment}</span>
                    <span className="text-ink/50 text-xs">
                      {r.TimeStart} – {r.TimeEnd}
                    </span>
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
