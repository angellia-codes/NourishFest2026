import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { Entertainment } from '@/types';

const FIELDS: FieldConfig<Entertainment>[] = [
  { key: 'Activity', label: 'Activity', type: 'text' },
  { key: 'Description', label: 'Description', type: 'textarea', hideInTable: true },
  { key: 'ContactName', label: 'Contact Name', type: 'text' },
  { key: 'ContactPhone', label: 'Contact Phone', type: 'text' },
  { key: 'Quantity', label: 'Quantity', type: 'number' },
  { key: 'Unit', label: 'Unit', type: 'text' },
  { key: 'Price', label: 'Price (IDR)', type: 'number' },
  {
    key: 'TotalEstimationCost',
    label: 'Total Estimation Cost',
    type: 'number',
    computed: (f) => (Number(f.Quantity) || 0) * (Number(f.Price) || 0),
  },
  { key: 'EstimationCost', label: 'Estimated Cost', type: 'number' },
  { key: 'ApprovalStatus', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

export function EntertainmentScreen() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<Entertainment>
      entity="Entertainment"
      title="Entertainment"
      fields={FIELDS}
      eventId={mainEventId}
      addLabel="Add Entertainment"
    />
  );
}
