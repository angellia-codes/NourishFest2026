import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { DoorPrize } from '@/types';

const FIELDS: FieldConfig<DoorPrize>[] = [
  { key: 'Item', label: 'Item', type: 'text' },
  { key: 'Category', label: 'Category', type: 'text' },
  { key: 'DetailSpec', label: 'Detail / Spec', type: 'textarea', hideInTable: true },
  { key: 'ImageLink', label: 'Image', type: 'file' },
  { key: 'EstimationCost', label: 'Estimated Cost', type: 'number' },
  { key: 'ApprovalStatus', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

export function DoorPrizeScreen() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<DoorPrize>
      entity="DoorPrize"
      title="Door Prize"
      fields={FIELDS}
      eventId={mainEventId}
      addLabel="Add Door Prize"
    />
  );
}
