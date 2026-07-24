import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/services/api';

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-jungle' : 'text-ink';
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`font-display text-2xl font-semibold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function formatIDR(value?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}

export function FinanceDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['financeDashboard'], queryFn: api.financeDashboard });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Finance Dashboard</h2>
        <p className="text-sm text-ink/50">Month-to-date, across all events.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading finance dashboard…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile label="MTD Income" value={formatIDR(data?.mtdIncoming)} />
          <StatTile label="MTD Expenses" value={formatIDR(data?.mtdExpenses)} />
          <StatTile
            label="Variance"
            value={`${formatIDR(data?.variance)} (${(data?.pctVariance ?? 0).toFixed(1)}%)`}
            tone={(data?.variance ?? 0) >= 0 ? 'success' : 'danger'}
          />
        </div>
      )}
    </div>
  );
}
