import { useEffect, useState } from 'react';
import { Loader2, ImagePlus, X, Printer } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { useFileUpload } from '@/hooks/useFileUpload';
import { usePermissions } from '@/context/PermissionContext';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Primitives';
import { EventRequiredNotice } from './EventRequiredNotice';
import { esc, printHtml } from './print';
import { EVENT_CATEGORIES, type Event } from '@/types';

export function EventDetailsPreScreen() {
  const { preEventId } = useSelectedEvent();
  return <EventDetailsForm eventId={preEventId} label="this Pre-Event month" />;
}

export function EventDetailsMainScreen() {
  const { mainEventId } = useSelectedEvent();
  return <EventDetailsForm eventId={mainEventId} label="the Main Event" />;
}

/**
 * Event pictures: public URLs in the attachments bucket, held in the draft until Save.
 * ponytail: removing a thumbnail drops the URL only — the object stays in the bucket,
 * since storage.objects has no delete policy. Add one if orphans start to matter.
 */
function PictureGallery({
  urls,
  onChange,
  canEdit,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  canEdit: boolean;
}) {
  const { upload, isUploading } = useFileUpload();

  const add = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    const added: string[] = [];
    for (const file of files) added.push((await upload(file)).url);
    onChange([...urls, ...added]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink/60">Pictures</p>
      {urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {urls.map((url) => (
            <div key={url} className="relative">
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" className="aspect-square w-full object-cover rounded-lg border border-ink/10" />
              </a>
              {canEdit && (
                <button
                  onClick={() => onChange(urls.filter((u) => u !== url))}
                  className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-ink/50 hover:text-red-600"
                  aria-label="Remove picture"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <label className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-ink/15 bg-white cursor-pointer hover:bg-paper/60">
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          Add pictures
          <input type="file" accept="image/*" multiple className="hidden" onChange={add} disabled={isUploading} />
        </label>
      )}
      {urls.length === 0 && !canEdit && <p className="text-xs text-ink/40">No pictures yet.</p>}
    </div>
  );
}

/** One-page fact sheet for an event: the form's fields plus its pictures. */
function exportEventPdf(event: Partial<Event>) {
  const rows: [string, string][] = [
    ['Event Name', event.EventName ?? ''],
    ['Category / Theme', event.CategoryOrTheme ?? ''],
    ['Category', event.Category ?? ''],
    ['Tagline', event.Tagline ?? ''],
    ['Date', event.Date ?? ''],
    ['Location', event.Location ?? ''],
    ['Status', event.Status ?? ''],
    ['Purpose', event.Purpose ?? ''],
  ];
  const photos = event.PhotoLinks ?? [];

  const css = `
  @page { size: A4 portrait; margin: 15mm; }
  body { font: 12px/1.5 system-ui, sans-serif; color: #1b1b1b; }
  h1 { font-size: 19px; margin: 0 0 14px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
  th, td { border-bottom: 1px solid #e6e6e6; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { width: 150px; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #666; margin: 0 0 8px; }
  .shots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .shots img { width: 100%; height: 190px; object-fit: cover; border: 1px solid #e0e0e0; border-radius: 6px;
               break-inside: avoid; }`;

  const html = `<h1>NourishFest 2026 — ${esc(event.EventName || 'Event')}</h1>
<table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v) || '—'}</td></tr>`).join('')}</table>
${photos.length ? `<h2>Pictures</h2><div class="shots">${photos.map((u) => `<img src="${esc(u)}" alt="">`).join('')}</div>` : ''}`;

  printHtml(`NourishFest 2026 — ${event.EventName || 'Event'}`, html, css);
}

/** Single-record view/edit for one Event, reused by both the Pre-Event and Main Event nav groups. */
export function EventDetailsForm({ eventId, label }: { eventId: string | null; label?: string }) {
  const { canWrite } = usePermissions();
  if (!eventId) return <EventRequiredNotice label={label} />;
  return <EventDetailsFormInner eventId={eventId} canEdit={canWrite('Events')} />;
}

function EventDetailsFormInner({ eventId, canEdit }: { eventId: string; canEdit: boolean }) {
  const { items, isLoading, update, isMutating, mutationError } = useEntityData<Event>('Events', { eventId });
  const event = items.find((e) => e.EventID === eventId);
  const [form, setForm] = useState<Partial<Event>>({});
  const [saved, setSaved] = useState(false);

  // Reset the draft only when switching events or on first load — not on every
  // 30s background poll, which would otherwise clobber in-progress edits.
  useEffect(() => {
    if (!isLoading) setForm(event ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isLoading]);

  // mutateAsync rejects on RLS denials and constraint violations — without the
  // catch the failure is swallowed and Save looks like it does nothing.
  const save = async () => {
    setSaved(false);
    try {
      await update(eventId, form);
      setSaved(true);
    } catch {
      /* rendered from mutationError below */
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading event…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Event Details</h2>
        <Button variant="ghost" onClick={() => exportEventPdf(form)}>
          <Printer className="h-4 w-4" /> Export PDF
        </Button>
      </div>
      <div className="rounded-xl border border-ink/10 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <Field label="Category">
            <Select
              disabled={!canEdit}
              value={form.Category ?? ''}
              onChange={(e) => setForm({ ...form, Category: e.target.value as Event['Category'] })}
            >
              <option value="">— select —</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
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
        <PictureGallery
          urls={form.PhotoLinks ?? []}
          onChange={(PhotoLinks) => setForm({ ...form, PhotoLinks })}
          canEdit={canEdit}
        />
        {canEdit && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {mutationError && <p className="text-xs text-red-600 flex-1">{mutationError.message}</p>}
            {saved && !mutationError && <p className="text-xs text-jungle">Saved.</p>}
            <Button onClick={save} disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
