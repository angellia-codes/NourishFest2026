import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { Rundown } from '@/types';

const FIELDS: FieldConfig<Rundown>[] = [
  { key: 'TimeStart', label: 'Start Time', type: 'text' },
  { key: 'TimeFinish', label: 'Finish Time', type: 'text' },
  { key: 'Description', label: 'Description', type: 'text' },
  { key: 'CommitteeInCharge', label: 'Committee In Charge', type: 'text' },
  { key: 'Remark', label: 'Remark', type: 'textarea', hideInTable: true },
];

export function RundownTimeline() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<Rundown>
      entity="Rundown"
      title="Rundown Event"
      fields={FIELDS}
      eventId={mainEventId}
      sortBy="TimeStart"
      addLabel="Add Segment"
    />
  );
}
