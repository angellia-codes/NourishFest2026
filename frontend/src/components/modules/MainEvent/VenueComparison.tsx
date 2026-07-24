import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { VenueComparison } from '@/types';

const FIELDS: FieldConfig<VenueComparison>[] = [
  { key: 'VenueName', label: 'Venue Name', type: 'text' },
  { key: 'Location', label: 'Location', type: 'text' },
  { key: 'ContactName', label: 'Contact Name', type: 'text' },
  { key: 'ContactPhone', label: 'Contact Phone', type: 'text' },
  { key: 'EstimationCost', label: 'Estimated Cost', type: 'number' },
  { key: 'LayoutImageLink', label: 'Layout Image', type: 'file' },
  { key: 'BenefitsInclude', label: 'Benefits Included', type: 'textarea', hideInTable: true },
  { key: 'BenefitsExclude', label: 'Benefits Excluded', type: 'textarea', hideInTable: true },
  { key: 'ApprovalStatus', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

export function VenueComparisonScreen() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<VenueComparison>
      entity="VenueComparison"
      title="Venue Comparison"
      fields={FIELDS}
      eventId={mainEventId}
      addLabel="Add Venue"
    />
  );
}
