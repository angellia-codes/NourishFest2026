import {
  Lightbulb,
  Users,
  Wallet,
  FileText,
  ListChecks,
  MapPin,
  Music4,
  Gift,
  Trophy,
  Package,
  Sparkles,
  Type,
  CalendarClock,
  Mic2,
  Dice5,
  UserSquare2,
  MoreHorizontal,
  FolderOpen,
} from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';
import type { Role } from '@/types';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string; // permission module name (sheet name, or Roster sheet for all 7)
}

export interface NavGroup {
  key: 'pre-event' | 'main-event' | 'documents';
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'pre-event',
    label: 'Road to NourishFest',
    items: [
      { key: 'ideas', label: 'Ideas', icon: Lightbulb, module: 'Ideas' },
      { key: 'committee', label: 'Committee', icon: Users, module: 'Committee' },
      { key: 'budget', label: 'Budget', icon: Wallet, module: 'Budget' },
      { key: 'proposal', label: 'Proposal', icon: FileText, module: 'Proposal' },
      { key: 'checklist-pre', label: 'Checklist', icon: ListChecks, module: 'Checklist' },
    ],
  },
  {
    key: 'main-event',
    label: 'NourishFest',
    items: [
      { key: 'theme-tagline', label: 'Theme & Tagline', icon: Type, module: 'EventInfo' },
      { key: 'venue', label: 'Venue', icon: MapPin, module: 'Venue' },
      { key: 'entertainment', label: 'Entertainment', icon: Music4, module: 'Roster' },
      { key: 'door-prize', label: 'Door Prize', icon: Gift, module: 'Roster' },
      { key: 'award', label: 'Award', icon: Trophy, module: 'Roster' },
      { key: 'souvenir', label: 'Souvenir', icon: Package, module: 'Roster' },
      { key: 'decoration', label: 'Decoration', icon: Sparkles, module: 'Roster' },
      { key: 'mini-games', label: 'Mini Games', icon: Dice5, module: 'Roster' },
      { key: 'others', label: 'Others', icon: MoreHorizontal, module: 'Roster' },
      { key: 'rundown', label: 'Rundown Event', icon: CalendarClock, module: 'Rundown' },
      { key: 'ngt', label: 'Nourish Got Talent', icon: Mic2, module: 'NourishGotTalent' },
      { key: 'participants', label: 'Participant Detail', icon: UserSquare2, module: 'ParticipantDetail' },
      { key: 'checklist-main', label: 'Checklist', icon: ListChecks, module: 'Checklist' },
      { key: 'budget-main', label: 'Budget', icon: Wallet, module: 'Budget' },
    ],
  },
  {
    key: 'documents',
    label: 'Documents',
    items: [{ key: 'documents', label: 'Quotations, Invoices & Files', icon: FolderOpen, module: 'Documents' }],
  },
];

interface SidebarProps {
  active: string;
  onSelect: (key: string) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const { can, loading } = usePermissions();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-ink text-paper flex flex-col grain-bg">
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="h-9 w-9 rounded-lg bg-festival-gradient mb-3" />
        <h1 className="font-display text-xl font-semibold leading-tight">NourishFest</h1>
        <p className="text-xs text-paper/60 tracking-wide">2026 · Event Command Center</p>
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
                const allowed = loading ? true : can(item.module, 'Viewer' as Role);
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
