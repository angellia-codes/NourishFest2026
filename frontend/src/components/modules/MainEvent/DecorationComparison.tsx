import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { DecorationComparison } from '@/types';

const FIELDS: FieldConfig<DecorationComparison>[] = [
  { key: 'DecorationName', label: 'Decoration Name', type: 'text' },
  { key: 'Vendor', label: 'Vendor', type: 'text' },
  { key: 'ContactName', label: 'Contact Name', type: 'text' },
  { key: 'ContactPhone', label: 'Contact Phone', type: 'text' },
  { key: 'EstimationCost', label: 'Estimated Cost', type: 'number' },
  { key: 'DesignImageLink', label: 'Design Image', type: 'file' },
  { key: 'BenefitsInclude', label: 'Benefits Included', type: 'textarea', hideInTable: true },
  { key: 'BenefitsExclude', label: 'Benefits Excluded', type: 'textarea', hideInTable: true },
  { key: 'ApprovalStatus', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

export function DecorationComparisonScreen() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<DecorationComparison>
      entity="DecorationComparison"
      title="Decoration Comparison"
      fields={FIELDS}
      eventId={mainEventId}
      addLabel="Add Decoration"
    />
  );
}
