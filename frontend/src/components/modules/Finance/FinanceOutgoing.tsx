import { Loader2 } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import type { BudgetBreakdown, Event } from '@/types';

function formatIDR(value?: number | string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}

/** Read-only — derived client-side from Paid BudgetBreakdown rows across all events. No dedicated backend entity. */
export function FinanceOutgoing() {
  const { items: budget, isLoading: budgetLoading } = useEntityData<BudgetBreakdown>('BudgetBreakdown');
  const { items: events, isLoading: eventsLoading } = useEntityData<Event>('Events');
  const isLoading = budgetLoading || eventsLoading;

  const paid = budget.filter((b) => b.PaymentStatus === 'Paid');
  const total = paid.reduce((s, b) => s + Number(b.ActualCost || 0), 0);
  const eventName = (eventId: string) => events.find((e) => e.EventID === eventId)?.EventName ?? eventId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Expense</h2>
          <p className="text-sm text-ink/50">Paid Budget line items, across all events.</p>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-ink/50">Total Paid</p>
          <p className="font-display text-xl font-semibold mt-1">{formatIDR(total)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : paid.length === 0 ? (
        <p className="text-sm text-ink/40 py-10 text-center">No paid line items yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paid.map((b) => (
                <tr key={b.BudgetID} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{b.ItemName}</td>
                  <td className="px-4 py-3 text-ink/60">{eventName(b.EventID)}</td>
                  <td className="px-4 py-3 text-ink/60">{b.CategoryExpense}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatIDR(b.ActualCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
