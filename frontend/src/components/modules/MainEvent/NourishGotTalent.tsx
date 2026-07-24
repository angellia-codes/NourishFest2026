import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { NourishGotTalent } from '@/types';

const FIELDS: FieldConfig<NourishGotTalent>[] = [
  { key: 'Category', label: 'Category', type: 'text' },
  { key: 'Prize', label: 'Prize', type: 'select', options: ['Cash', 'Voucher'] },
  { key: 'Value', label: 'Value (IDR)', type: 'number' },
  { key: 'ApprovalStatus', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
];

export function NourishGotTalentScreen() {
  const { mainEventId } = useSelectedEvent();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<NourishGotTalent>
      entity="NourishGotTalent"
      title="Nourish Got Talent"
      fields={FIELDS}
      eventId={mainEventId}
      addLabel="Add Entry"
    />
  );
}
