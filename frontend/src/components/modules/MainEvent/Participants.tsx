import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Primitives';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import type { Participants } from '@/types';

const EMPTY: Partial<Participants> = { EstimationParticipant: 0, ActualParticipant: 0, AttendanceFormRef: '' };

export function ParticipantsPreScreen() {
  const { preEventId } = useSelectedEvent();
  return <ParticipantsPanel eventId={preEventId} />;
}

export function ParticipantsMainScreen() {
  const { mainEventId } = useSelectedEvent();
  return <ParticipantsPanel eventId={mainEventId} />;
}

/** One row per event (EventID doubles as its ID) — a tiny aggregate-count form, not a table. */
export function ParticipantsPanel({ eventId }: { eventId: string | null }) {
  const { canWrite } = usePermissions();
  if (!eventId) return <EventRequiredNotice />;
  return <ParticipantsPanelInner eventId={eventId} canEdit={canWrite('Participants')} />;
}

function ParticipantsPanelInner({ eventId, canEdit }: { eventId: string; canEdit: boolean }) {
  const { items, isLoading, update, create, isMutating } = useEntityData<Participants>('Participants', { eventId });
  const record = items.find((p) => p.EventID === eventId);
  const [form, setForm] = useState<Partial<Participants>>(EMPTY);

  useEffect(() => {
    if (!isLoading) setForm(record ?? EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isLoading]);

  const save = () => (record ? update(eventId, form) : create({ ...form, EventID: eventId }));

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-display text-2xl font-semibold">Participants</h2>
      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="rounded-xl border border-ink/10 bg-white p-4 space-y-3">
          <Field label="Estimated Participants">
            <Input
              type="number"
              disabled={!canEdit}
              value={form.EstimationParticipant ?? 0}
              onChange={(e) => setForm({ ...form, EstimationParticipant: Number(e.target.value) })}
            />
          </Field>
          <Field label="Actual Participants">
            <Input
              type="number"
              disabled={!canEdit}
              value={form.ActualParticipant ?? 0}
              onChange={(e) => setForm({ ...form, ActualParticipant: Number(e.target.value) })}
            />
          </Field>
          <Field label="Attendance Form Reference">
            <Input
              disabled={!canEdit}
              value={form.AttendanceFormRef ?? ''}
              onChange={(e) => setForm({ ...form, AttendanceFormRef: e.target.value })}
            />
          </Field>
          {canEdit && (
            <div className="flex justify-end pt-2">
              <Button onClick={save} disabled={isMutating}>
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
