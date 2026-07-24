import { useState } from 'react';
import {
  LayoutDashboard,
  Lightbulb,
  Users,
  Wallet,
  ListChecks,
  MapPin,
  Music4,
  Gift,
  Trophy,
  Package,
  Sparkles,
  CalendarClock,
  UserSquare2,
  Info,
  CalendarPlus,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  Mic2,
} from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';
import type { EntityName } from '@/types';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  entity: EntityName;
  requireWrite?: boolean; // Admin-only items (e.g. Event Management)
  group?: string; // collapsible sub-header within a NavGroup, e.g. "Budget", "Prizes & Awards"
}

export interface NavGroup {
  key: 'overview' | 'pre-event' | 'main-event' | 'finance';
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, entity: 'Events' },
      { key: 'committee', label: 'Committee', icon: Users, entity: 'Committee' },
      { key: 'ideas', label: 'Ideas', icon: Lightbulb, entity: 'Ideas' },
      { key: 'event-management', label: 'Event Management', icon: CalendarPlus, entity: 'Events', requireWrite: true },
    ],
  },
  {
    key: 'pre-event',
    label: 'Road to NourishFest',
    items: [
      { key: 'event-details-pre', label: 'Event Details', icon: Info, entity: 'Events' },
      { key: 'budget-pre', label: 'Budget', icon: Wallet, entity: 'BudgetBreakdown' },
      { key: 'participants-pre', label: 'Participants', icon: UserSquare2, entity: 'Participants' },
      { key: 'rundown-pre', label: 'Rundown', icon: CalendarClock, entity: 'Rundown' },
      { key: 'checklist-pre', label: 'Checklist', icon: ListChecks, entity: 'Checklist' },
    ],
  },
  {
    key: 'main-event',
    label: 'NourishFest',
    items: [
      { key: 'event-details-main', label: 'Event Details', icon: Info, entity: 'Events' },
      { key: 'participants-main', label: 'Participants', icon: UserSquare2, entity: 'Participants' },
      { key: 'budget-main', label: 'Budget', icon: Wallet, entity: 'BudgetBreakdown' },
      { key: 'venue', label: 'Venue', icon: MapPin, entity: 'VenueComparison', group: 'Budget' },
      { key: 'decoration', label: 'Decoration', icon: Sparkles, entity: 'DecorationComparison', group: 'Budget' },
      { key: 'souvenir', label: 'Merchandise', icon: Package, entity: 'SouvenirComparison', group: 'Budget' },
      { key: 'entertainment', label: 'Entertainment', icon: Music4, entity: 'Entertainment', group: 'Budget' },
      { key: 'door-prize', label: 'Door Prize', icon: Gift, entity: 'DoorPrize', group: 'Prizes & Awards' },
      { key: 'awards', label: 'Awards', icon: Trophy, entity: 'Awards', group: 'Prizes & Awards' },
      { key: 'nourish-got-talent', label: 'Nourish Got Talent', icon: Mic2, entity: 'NourishGotTalent', group: 'Prizes & Awards' },
      { key: 'rundown', label: 'Rundown Event', icon: CalendarClock, entity: 'Rundown' },
      { key: 'checklist-main', label: 'Checklist', icon: ListChecks, entity: 'Checklist' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      { key: 'finance-dashboard', label: 'Dashboard', icon: LayoutDashboard, entity: 'Finance_Incoming' },
      { key: 'finance-incoming', label: 'Income', icon: ArrowDownCircle, entity: 'Finance_Incoming' },
      { key: 'finance-outgoing', label: 'Expense', icon: ArrowUpCircle, entity: 'Finance_Incoming' },
    ],
  },
];

interface SidebarProps {
  active: string;
  onSelect: (key: string) => void;
}

// Partitions a group's flat items into ungrouped items and contiguous
// same-`group` runs, preserving order — the sidebar itself stays a flat
// array (App.tsx's activeGroup lookup needs no change); grouping is purely
// a render-time concern local to this component.
type NavRun = { group: string; items: NavItem[] } | { group: null; item: NavItem };

function partitionByGroup(items: NavItem[]): NavRun[] {
  const runs: NavRun[] = [];
  items.forEach((item) => {
    const last = runs[runs.length - 1];
    if (item.group && last && last.group === item.group) {
      last.items.push(item);
    } else if (item.group) {
      runs.push({ group: item.group, items: [item] });
    } else {
      runs.push({ group: null, item });
    }
  });
  return runs;
}

function NavButton({
  item,
  isActive,
  allowed,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  allowed: boolean;
  onSelect: (key: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      disabled={!allowed}
      onClick={() => onSelect(item.key)}
      className={[
        'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
        isActive
          ? 'bg-gradient-to-r from-guava to-coral text-white font-medium shadow-sm'
          : 'text-paper/75 hover:bg-white/10 hover:text-paper',
        !allowed && 'opacity-30 cursor-not-allowed hover:bg-transparent',
      ].join(' ')}
      title={!allowed ? 'You do not have access to this module' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const { accessLevel, loading } = usePermissions();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const isAllowed = (item: NavItem) => {
    const level = loading ? 'write' : accessLevel(item.entity);
    return loading ? true : item.requireWrite ? level === 'write' : level !== 'none';
  };

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-ink text-paper flex flex-col grain-bg">
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="h-9 w-9 rounded-lg bg-festival-gradient mb-3" />
        <h1 className="font-display text-xl font-semibold leading-tight">NourishFest 2026</h1>
        <p className="text-xs text-paper/60 tracking-wide">Event Management App</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper/40">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {partitionByGroup(group.items).map((run, i) => {
                if (run.group === null) {
                  return (
                    <NavButton
                      key={run.item.key}
                      item={run.item}
                      isActive={active === run.item.key}
                      allowed={isAllowed(run.item)}
                      onSelect={onSelect}
                    />
                  );
                }
                const subKey = `${group.key}:${run.group}`;
                const isOpen = !collapsed[subKey]; // default open
                return (
                  <div key={subKey ?? i}>
                    <button
                      onClick={() => toggleGroup(subKey)}
                      className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-paper/50 hover:text-paper/80"
                    >
                      <span>{run.group}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    </button>
                    <div
                      className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
                      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                    >
                      <div className="min-h-0 space-y-0.5 pl-2">
                        {run.items.map((item) => (
                          <NavButton
                            key={item.key}
                            item={item}
                            isActive={active === item.key}
                            allowed={isAllowed(item)}
                            onSelect={onSelect}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
