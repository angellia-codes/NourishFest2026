import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { Awards } from '@/types';

const FIELDS: FieldConfig<Awards>[] = [
  { key: 'Category', label: 'Category', type: 'text' },
  { key: 'Description', label: 'Description', type: 'textarea', hideInTable: true },
  { key: 'Prize', label: 'Prize', type: 'text' },
  { key: 'EstimationCost', label: 'Estimated Cost', type: 'number' },
  { key: 'ApprovalStatus', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

export function AwardsScreen() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<Awards>
      entity="Awards"
      title="Awards"
      fields={FIELDS}
      eventId={mainEventId}
      addLabel="Add Award"
    />
  );
}
