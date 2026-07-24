import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Primitives';
import { EventRequiredNotice } from './EventRequiredNotice';
import type { Event } from '@/types';

export function EventDetailsPreScreen() {
  const { preEventId } = useSelectedEvent();
  return <EventDetailsForm eventId={preEventId} label="this Pre-Event month" />;
}

export function EventDetailsMainScreen() {
  const { mainEventId } = useSelectedEvent();
  return <EventDetailsForm eventId={mainEventId} label="the Main Event" />;
}

/** Single-record view/edit for one Event, reused by both the Pre-Event and Main Event nav groups. */
export function EventDetailsForm({ eventId, label }: { eventId: string | null; label?: string }) {
  const { canWrite } = usePermissions();
  if (!eventId) return <EventRequiredNotice label={label} />;
  return <EventDetailsFormInner eventId={eventId} canEdit={canWrite('Events')} />;
}

function EventDetailsFormInner({ eventId, canEdit }: { eventId: string; canEdit: boolean }) {
  const { items, isLoading, update, isMutating } = useEntityData<Event>('Events', { eventId });
  const event = items.find((e) => e.EventID === eventId);
  const [form, setForm] = useState<Partial<Event>>({});

  // Reset the draft only when switching events or on first load — not on every
  // 30s background poll, which would otherwise clobber in-progress edits.
  useEffect(() => {
    if (!isLoading) setForm(event ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isLoading]);

  const save = () => update(eventId, form);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading event…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="font-display text-2xl font-semibold">Event Details</h2>
      <div className="rounded-xl border border-ink/10 bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Event Name">
            <Input disabled={!canEdit} value={form.EventName ?? ''} onChange={(e) => setForm({ ...form, EventName: e.target.value })} />
          </Field>
          <Field label="Category / Theme">
            <Input
              disabled={!canEdit}
              value={form.CategoryOrTheme ?? ''}
              onChange={(e) => setForm({ ...form, CategoryOrTheme: e.target.value })}
            />
          </Field>
          <Field label="Tagline">
            <Input disabled={!canEdit} value={form.Tagline ?? ''} onChange={(e) => setForm({ ...form, Tagline: e.target.value })} />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              disabled={!canEdit}
              value={form.Date ?? ''}
              onChange={(e) => setForm({ ...form, Date: e.target.value })}
            />
          </Field>
          <Field label="Location">
            <Input disabled={!canEdit} value={form.Location ?? ''} onChange={(e) => setForm({ ...form, Location: e.target.value })} />
          </Field>
          <Field label="Status">
            <Input disabled={!canEdit} value={form.Status ?? ''} onChange={(e) => setForm({ ...form, Status: e.target.value })} />
          </Field>
        </div>
        <Field label="Purpose">
          <Textarea disabled={!canEdit} value={form.Purpose ?? ''} onChange={(e) => setForm({ ...form, Purpose: e.target.value })} />
        </Field>
        {canEdit && (
          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
