import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { usePermissions } from '@/context/PermissionContext';
import { IdeasBoard } from '@/components/modules/PreEvent/Ideas';
import { CommitteeGrid } from '@/components/modules/PreEvent/Committee';
import { BudgetTable } from '@/components/modules/PreEvent/Budget';
import { ProposalEditor } from '@/components/modules/PreEvent/Proposal';
import { ChecklistBoard } from '@/components/modules/Checklist/Checklist';
import { EventInfoPanel } from '@/components/modules/MainEvent/EventInfo';
import { VenueList } from '@/components/modules/MainEvent/Venue';
import { RosterModuleScreen } from '@/components/modules/MainEvent/RosterModule';
import { RundownTimeline } from '@/components/modules/MainEvent/Rundown';
import { NourishGotTalentBoard } from '@/components/modules/MainEvent/NourishGotTalent';
import { ParticipantRoster } from '@/components/modules/MainEvent/ParticipantDetail';
import { DocumentsScreen } from '@/components/documents/DocumentsScreen';
import { ShieldAlert } from 'lucide-react';

const SCREENS: Record<string, React.ComponentType> = {
  ideas: IdeasBoard,
  committee: CommitteeGrid,
  budget: () => <BudgetTable phase="Pre-Event" title="Budget — Pre-Event" />,
  proposal: ProposalEditor,
  'checklist-pre': () => <ChecklistBoard phase="Pre-Event" title="Checklist — Pre-Event" />,

  'theme-tagline': EventInfoPanel,
  venue: VenueList,
  entertainment: () => <RosterModuleScreen moduleName="Entertainment" title="Entertainment" />,
  'door-prize': () => <RosterModuleScreen moduleName="Door Prize" title="Door Prize" />,
  award: () => <RosterModuleScreen moduleName="Award" title="Award" />,
  souvenir: () => <RosterModuleScreen moduleName="Souvenir" title="Souvenir" />,
  decoration: () => <RosterModuleScreen moduleName="Decoration" title="Decoration" />,
  'mini-games': () => <RosterModuleScreen moduleName="Mini Games" title="Mini Games" />,
  others: () => <RosterModuleScreen moduleName="Others" title="Others" />,
  rundown: RundownTimeline,
  ngt: NourishGotTalentBoard,
  participants: ParticipantRoster,
  'checklist-main': () => <ChecklistBoard phase="Main Event" title="Checklist — Main Event" />,
  'budget-main': () => <BudgetTable phase="Main Event" title="Budget — Main Event" />,

  documents: DocumentsScreen,
};

export default function App() {
  const [active, setActive] = useState('ideas');
  const { email, loading } = usePermissions();
  const Screen = SCREENS[active] ?? IdeasBoard;

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-ink/10 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-ink/40">NourishFest 2026 · Organizer Console</p>
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
