import { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sidebar, NAV_GROUPS } from '@/components/layout/Sidebar';
import { usePermissions } from '@/context/PermissionContext';
import { useAuth } from '@/context/AuthContext';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import { Select } from '@/components/ui/Primitives';
import { GoogleSignInButton } from '@/components/shared/GoogleSignInButton';
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
import { NourishGotTalentScreen } from '@/components/modules/MainEvent/NourishGotTalent';
import { RundownTimeline, RundownPreScreen } from '@/components/modules/MainEvent/Rundown';
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
  'rundown-pre': RundownPreScreen,
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
  'nourish-got-talent': NourishGotTalentScreen,
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

const LG_BREAKPOINT = 1024; // Tailwind's `lg` — keep in step with the sidebar's lg: classes

export default function App() {
  const [active, setActive] = useState('dashboard');
  // Open by default on desktop, closed on phones/tablets where the sidebar
  // overlays the content rather than sitting beside it.
  const [navOpen, setNavOpen] = useState(() => window.innerWidth >= LG_BREAKPOINT);
  const { email, tier, loading } = usePermissions();
  const { signOut } = useAuth();
  const Screen = SCREENS[active] ?? Dashboard;
  const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.key === active));

  // Re-sync when the viewport crosses the lg boundary — rotating a tablet
  // (iPad landscape 1180 -> portrait 820) would otherwise leave the drawer
  // open on top of the content. matchMedia fires only on the crossing, so a
  // manual toggle within one size class is left alone.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const sync = (e: MediaQueryListEvent) => setNavOpen(e.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // On a narrow screen the drawer covers the page, so picking a destination
  // has to dismiss it or the user never sees where they landed.
  const selectAndClose = (key: string) => {
    setActive(key);
    if (window.innerWidth < LG_BREAKPOINT) setNavOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar active={active} onSelect={selectAndClose} open={navOpen} />
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-ink/50 lg:hidden"
          aria-hidden="true"
        />
      )}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-ink/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setNavOpen((o) => !o)}
              aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
              aria-expanded={navOpen}
              title={navOpen ? 'Hide navigation' : 'Show navigation'}
              className="-ml-1 rounded-md p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink/70"
            >
              {navOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            {/* The sidebar already shows the app name, so on phones — where the
                sidebar is hidden by default — keep the short form only. */}
            <p className="text-xs text-ink/40 truncate">
              <span className="hidden sm:inline">NourishFest 2026 · </span>Event Management App
            </p>
            {activeGroup?.key === 'pre-event' && <PreEventPicker />}
          </div>
          {!loading && !email && <GoogleSignInButton />}
          {!loading && email && tier === 'none' && (
            <span className="flex items-start gap-1.5 text-xs text-red-600 max-w-full">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="min-w-0">Signed in as {email} — not a recognized committee member</span>
            </span>
          )}
          {email && tier !== 'none' && (
            <div className="flex items-center gap-3 min-w-0">
              {/* Email is the first thing to go when space is tight — the
                  sign-out control matters more than the address. */}
              <span className="hidden sm:block text-xs text-ink/50 truncate">{email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-xs text-ink/40 hover:text-ink/70 shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </header>
        <div className="px-4 sm:px-6 py-6 max-w-6xl">
          <Screen />
        </div>
      </main>
    </div>
  );
}
