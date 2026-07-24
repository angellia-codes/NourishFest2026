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
} from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';
import type { EntityName } from '@/types';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  entity: EntityName;
  requireWrite?: boolean; // Admin-only items (e.g. Event Management)
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
      { key: 'venue', label: 'Venue Comparison', icon: MapPin, entity: 'VenueComparison' },
      { key: 'decoration', label: 'Decoration Comparison', icon: Sparkles, entity: 'DecorationComparison' },
      { key: 'souvenir', label: 'Souvenir Comparison', icon: Package, entity: 'SouvenirComparison' },
      { key: 'entertainment', label: 'Entertainment', icon: Music4, entity: 'Entertainment' },
      { key: 'awards', label: 'Awards', icon: Trophy, entity: 'Awards' },
      { key: 'door-prize', label: 'Door Prize', icon: Gift, entity: 'DoorPrize' },
      { key: 'rundown', label: 'Rundown Event', icon: CalendarClock, entity: 'Rundown' },
      { key: 'checklist-main', label: 'Checklist', icon: ListChecks, entity: 'Checklist' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      { key: 'finance-dashboard', label: 'Dashboard', icon: LayoutDashboard, entity: 'Finance_Incoming' },
      { key: 'finance-incoming', label: 'Incoming', icon: ArrowDownCircle, entity: 'Finance_Incoming' },
      { key: 'finance-outgoing', label: 'Outgoing', icon: ArrowUpCircle, entity: 'Finance_Incoming' },
    ],
  },
];

interface SidebarProps {
  active: string;
  onSelect: (key: string) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const { accessLevel, loading } = usePermissions();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-ink text-paper flex flex-col grain-bg">
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="h-9 w-9 rounded-lg bg-festival-gradient mb-3" />
        <h1 className="font-display text-xl font-semibold leading-tight">NourishFest</h1>
        <p className="text-xs text-paper/60 tracking-wide">2026 · Event Management App</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper/40">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                const level = loading ? 'write' : accessLevel(item.entity);
                const allowed = loading ? true : item.requireWrite ? level === 'write' : level !== 'none';
                return (
                  <button
                    key={item.key}
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
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
