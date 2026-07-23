import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Primitives';
import { AIPromptBox } from '@/components/ai/AIPromptBox';
import { AIImagePanel } from '@/components/ai/AIImagePanel';
import type { AIKind, EventInfoField } from '@/types';

const FIELDS = ['Theme', 'Tagline'] as const;

/**
 * Single-value settings screen (Pattern A). Each named field is one row in
 * the `EventInfo` tab; create-if-missing on first save.
 */
export function EventInfoPanel() {
  const { items, isLoading, create, update, isMutating } = useSheetData<EventInfoField>('EventInfo');
  const { can } = usePermissions();
  const canEdit = can('EventInfo', 'Editor');

  const [draft, setDraft] = useState<Record<string, { Value: string; Notes: string }>>({});

  useEffect(() => {
    const next: Record<string, { Value: string; Notes: string }> = {};
    FIELDS.forEach((f) => {
      const row = items.find((i) => i.Field === f);
      next[f] = { Value: row?.Value ?? '', Notes: row?.Notes ?? '' };
    });
    setDraft(next);
  }, [items]);

  const save = async (field: string) => {
    const existing = items.find((i) => i.Field === field);
    const payload = { Field: field, ...draft[field] };
    if (existing) await update(existing.Id, payload);
    else await create(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="font-display text-2xl font-semibold">Theme &amp; Tagline</h2>
      {FIELDS.map((field) => (
        <div key={field} className="rounded-xl border border-ink/10 bg-white p-4 space-y-3">
          <Field label={field}>
            <Input
              value={draft[field]?.Value ?? ''}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, [field]: { ...draft[field], Value: e.target.value } })}
            />
          </Field>
          <AIPromptBox
            kind={field.toLowerCase() as AIKind}
            label={`AI ${field.toLowerCase()} suggestions`}
            placeholder="e.g. tropical, high-energy, family-friendly…"
            onPick={(s) => setDraft({ ...draft, [field]: { ...draft[field], Value: s } })}
          />
          {field === 'Theme' && <AIImagePanel kind="theme" label="AI theme mood image" />}
          <Field label="Notes">
            <Textarea
              value={draft[field]?.Notes ?? ''}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, [field]: { ...draft[field], Notes: e.target.value } })}
            />
          </Field>
          {canEdit && (
            <Button size="sm" onClick={() => save(field)} disabled={isMutating}>
              {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save {field}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
