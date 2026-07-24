import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Sidebar, NAV_GROUPS } from '@/components/layout/Sidebar';
import { usePermissions } from '@/context/PermissionContext';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import { Select } from '@/components/ui/Primitives';
import { Dashboard } from '@/components/modules/Dashboard/Dashboard';
import { IdeasBoard } from '@/components/modules/PreEvent/Ideas';
import { CommitteeGrid } from '@/components/modules/PreEvent/Committee';
import { EventManagement } from '@/components/modules/Overview/EventManagement';
import { EventDetailsPreScreen, EventDetailsMainScreen } from '@/components/shared/EventDetailsForm';
import { BudgetPreEventScreen, BudgetMainEventScreen } from '@/components/modules/PreEvent/Budget';
import { ParticipantsPreScreen, ParticipantsMainScreen } from '@/components/modules/MainEvent/Participants';
import { ChecklistPreEventScreen, ChecklistMainEventScreen } from '@/components/modules/Checklist/Checklist';
import { VenueComparisonScreen } from '@/components/modules/MainEvent/VenueComparison';
import { DecorationComparisonScreen } from '@/components/modules/MainEvent/DecorationComparison';
import { SouvenirComparisonScreen } from '@/components/modules/MainEvent/SouvenirComparison';
import { EntertainmentScreen } from '@/components/modules/MainEvent/Entertainment';
import { AwardsScreen } from '@/components/modules/MainEvent/Awards';
import { DoorPrizeScreen } from '@/components/modules/MainEvent/DoorPrize';
import { RundownTimeline } from '@/components/modules/MainEvent/Rundown';
import { FinanceDashboard } from '@/components/modules/Finance/FinanceDashboard';
import { FinanceIncomingScreen } from '@/components/modules/Finance/FinanceIncoming';
import { FinanceOutgoing } from '@/components/modules/Finance/FinanceOutgoing';

const SCREENS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  committee: CommitteeGrid,
  ideas: IdeasBoard,
  'event-management': EventManagement,

  'event-details-pre': EventDetailsPreScreen,
  'budget-pre': BudgetPreEventScreen,
  'participants-pre': ParticipantsPreScreen,
  'checklist-pre': ChecklistPreEventScreen,

  'event-details-main': EventDetailsMainScreen,
  'participants-main': ParticipantsMainScreen,
  'budget-main': BudgetMainEventScreen,
  venue: VenueComparisonScreen,
  decoration: DecorationComparisonScreen,
  souvenir: SouvenirComparisonScreen,
  entertainment: EntertainmentScreen,
  awards: AwardsScreen,
  'door-prize': DoorPrizeScreen,
  rundown: RundownTimeline,
  'checklist-main': ChecklistMainEventScreen,

  'finance-dashboard': FinanceDashboard,
  'finance-incoming': FinanceIncomingScreen,
  'finance-outgoing': FinanceOutgoing,
};

function PreEventPicker() {
  const { preEvents, preEventId, setPreEventId } = useSelectedEvent();
  if (preEvents.length === 0) return null;
  return (
    <Select
      value={preEventId ?? ''}
      onChange={(e) => setPreEventId(e.target.value)}
      className="!w-auto text-xs !py-1.5"
    >
      {preEvents.map((ev) => (
        <option key={ev.EventID} value={ev.EventID}>
          {ev.Month || ev.EventName}
        </option>
      ))}
    </Select>
  );
}

export default function App() {
  const [active, setActive] = useState('dashboard');
  const { email, loading } = usePermissions();
  const Screen = SCREENS[active] ?? Dashboard;
  const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.key === active));

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-ink/10 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs text-ink/40">NourishFest 2026 · Event Management App</p>
            {activeGroup?.key === 'pre-event' && <PreEventPicker />}
          </div>
          {!loading && !email && (
            <span className="flex items-center gap-1.5 text-xs text-red-600">
              <ShieldAlert className="h-3.5 w-3.5" /> Not signed in — no modules will be editable
            </span>
          )}
          {email && <span className="text-xs text-ink/50">{email}</span>}
        </header>
        <div className="px-6 py-6 max-w-6xl">
          <Screen />
        </div>
      </main>
    </div>
  );
}
