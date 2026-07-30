import { EntityCrudTable, type FieldConfig } from '@/components/shared/EntityCrudTable';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { useEntityData } from '@/hooks/useEntityData';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import type { Committee, Rundown } from '@/types';

/**
 * Committee In Charge is picked from the roster instead of typed. It stores the
 * *Name*, not the email like Checklist.Assignee does — nothing keys off this
 * column, and the name is what the rundown is read off on the day.
 */
function useRundownFields(): FieldConfig<Rundown>[] {
  const { items: committee } = useEntityData<Committee>('Committee');
  const names = [...new Set(committee.filter((m) => m.Status === 'Active' && m.Name).map((m) => m.Name))];
  return [
    { key: 'TimeStart', label: 'Start Time', type: 'text' },
    { key: 'TimeFinish', label: 'Finish Time', type: 'text' },
    { key: 'Description', label: 'Description', type: 'text' },
    // leading '' is the "nobody yet" option, and what emptyForm() defaults to
    { key: 'CommitteeInCharge', label: 'Committee In Charge', type: 'select', options: ['', ...names] },
    { key: 'Remark', label: 'Remark', type: 'textarea', hideInTable: true },
  ];
}

export function RundownTimeline() {
  const { mainEventId } = useSelectedEvent();
  const fields = useRundownFields();
  if (!mainEventId) return <EventRequiredNotice label="the Main Event" />;
  return (
    <EntityCrudTable<Rundown>
      entity="Rundown"
      title="Rundown Event"
      fields={fields}
      eventId={mainEventId}
      sortBy="TimeStart"
      addLabel="Add Segment"
    />
  );
}

export function RundownPreScreen() {
  const { preEventId } = useSelectedEvent();
  const fields = useRundownFields();
  if (!preEventId) return <EventRequiredNotice label="this Pre-Event month" />;
  return (
    <EntityCrudTable<Rundown>
      entity="Rundown"
      title="Rundown"
      fields={fields}
      eventId={preEventId}
      sortBy="TimeStart"
      addLabel="Add Segment"
    />
  );
}
