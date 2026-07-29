import { useState } from 'react';
import { Plus, Loader2, Trash2, Printer } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { AIPromptBox } from '@/components/shared/AIPromptBox';
import { esc, printHtml } from '@/components/shared/print';
import { EVENT_CATEGORIES, IDEA_SCOPES, type Idea, type IdeaScope, type IdeaStatus } from '@/types';

const STATUSES: IdeaStatus[] = ['New', 'Under Review', 'Approved', 'Rejected', 'Implemented'];

const STATUS_TONE: Record<IdeaStatus, 'neutral' | 'info' | 'success' | 'danger' | 'brand'> = {
  New: 'neutral',
  'Under Review': 'info',
  Approved: 'success',
  Rejected: 'danger',
  Implemented: 'brand',
};

/** Prints the given ideas as a landscape table. `scopeLabel` names the active filter. */
function exportIdeasPdf(ideas: Idea[], scopeLabel: string, showScope: boolean) {
  const scopeName = (s: IdeaScope) => IDEA_SCOPES.find((x) => x.value === s)?.label ?? s;
  const cols = [
    ...(showScope ? [{ head: 'Event', get: (i: Idea) => scopeName(i.Scope) }] : []),
    { head: 'Title', get: (i: Idea) => i.Title },
    { head: 'Status', get: (i: Idea) => i.Status },
    { head: 'Category', get: (i: Idea) => i.Category },
    { head: 'Description', get: (i: Idea) => i.Description },
    { head: 'Theme · Tagline', get: (i: Idea) => [i.Theme, i.Tagline].filter(Boolean).join(' · ') },
    { head: 'Submitted by', get: (i: Idea) => i.SubmittedBy || 'Unknown' },
    { head: 'Date', get: (i: Idea) => i.DateSubmitted },
  ];

  const css = `
  @page { size: A4 landscape; margin: 12mm; }
  body { font: 11px/1.4 system-ui, sans-serif; color: #1b1b1b; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: #777; font-size: 11px; margin-bottom: 14px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d8d8d8; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  td.desc { max-width: 260px; }`;

  const html = `<h1>NourishFest 2026 — Ideas</h1>
<div class="sub">${esc(scopeLabel)} · ${ideas.length} idea${ideas.length === 1 ? '' : 's'}</div>
<table>
  <thead><tr>${cols.map((c) => `<th>${esc(c.head)}</th>`).join('')}</tr></thead>
  <tbody>${ideas
    .map(
      (i) =>
        `<tr>${cols
          .map((c) => `<td${c.head === 'Description' ? ' class="desc"' : ''}>${esc(c.get(i))}</td>`)
          .join('')}</tr>`,
    )
    .join('')}</tbody>
</table>`;

  printHtml(`NourishFest 2026 — Ideas (${scopeLabel})`, html, css);
}

interface IdeaCardProps {
  idea: Idea;
  canManage: boolean;
  onStatusChange: (idea: Idea, status: IdeaStatus) => void;
  onRemove: (idea: Idea) => void;
}

function IdeaCard({ idea, canManage, onStatusChange, onRemove }: IdeaCardProps) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug">{idea.Title}</h3>
        <Badge tone={STATUS_TONE[idea.Status] ?? 'neutral'}>{idea.Status}</Badge>
      </div>
      <p className="text-sm text-ink/60 flex-1">{idea.Description}</p>
      {(idea.Theme || idea.Tagline) && (
        <p className="text-xs text-ink/50 italic">{[idea.Theme, idea.Tagline].filter(Boolean).join(' · ')}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-ink/5 text-xs text-ink/50">
        <span>by {idea.SubmittedBy || 'Unknown'}</span>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Select
                value={idea.Status}
                onChange={(e) => onStatusChange(idea, e.target.value as IdeaStatus)}
                className="!w-auto text-xs !py-1"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <button onClick={() => onRemove(idea)} className="text-ink/30 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function IdeasBoard() {
  const { items, isLoading, create, update, remove, isMutating } = useEntityData<Idea>('Ideas');
  const { accessLevel, canWrite } = usePermissions();
  const level = accessLevel('Ideas');
  const canSubmit = level === 'write' || level === 'special';
  const canManage = canWrite('Ideas');

  const [filter, setFilter] = useState<IdeaScope | 'all'>('all');
  const [activeScope, setActiveScope] = useState<IdeaScope | null>(null);
  const [form, setForm] = useState<Partial<Idea>>({ Title: '', Description: '', Category: '', Theme: '', Tagline: '' });
  const [submitError, setSubmitError] = useState('');

  const openFor = (scope: IdeaScope) => {
    setActiveScope(scope);
    setForm({ Title: '', Description: '', Category: '', Theme: '', Tagline: '' });
    setSubmitError('');
  };

  const submit = async () => {
    if (!activeScope) return;
    setSubmitError('');
    try {
      await create({ ...form, Scope: activeScope });
      setActiveScope(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit idea.');
    }
  };

  const setStatus = (idea: Idea, status: IdeaStatus) => update(idea.IdeaID, { Status: status });
  const removeIdea = (idea: Idea) => remove(idea.IdeaID);

  const forScope = (scope: IdeaScope) =>
    [...items]
      .filter((i) => i.Scope === scope)
      .sort((a, b) => (b.DateSubmitted ?? '').localeCompare(a.DateSubmitted ?? ''));

  const sections = IDEA_SCOPES.filter((s) => filter === 'all' || s.value === filter);
  const visible = sections.flatMap((s) => forScope(s.value));
  const filterLabel = filter === 'all' ? 'All months' : (IDEA_SCOPES.find((s) => s.value === filter)?.label ?? '');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Ideas</h2>
          <p className="text-sm text-ink/50">One submission per person per event.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as IdeaScope | 'all')}
            className="!w-auto text-sm"
          >
            <option value="all">All months</option>
            {IDEA_SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            onClick={() => exportIdeasPdf(visible, filterLabel, filter === 'all')}
            disabled={visible.length === 0}
          >
            <Printer className="h-4 w-4" /> Print to PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ideas…
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.value} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{section.label}</h3>
              {canSubmit && (
                <Button onClick={() => openFor(section.value)}>
                  <Plus className="h-4 w-4" /> Submit Idea
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {forScope(section.value).map((idea) => (
                <IdeaCard
                  key={idea.IdeaID}
                  idea={idea}
                  canManage={canManage}
                  onStatusChange={setStatus}
                  onRemove={removeIdea}
                />
              ))}
              {forScope(section.value).length === 0 && (
                <p className="text-sm text-ink/40 md:col-span-2 xl:col-span-3">No ideas submitted yet.</p>
              )}
            </div>
          </div>
        ))
      )}

      <Modal
        open={activeScope !== null}
        onClose={() => setActiveScope(null)}
        title={`Submit an Idea — ${IDEA_SCOPES.find((s) => s.value === activeScope)?.label ?? ''}`}
      >
        <div className="space-y-3">
          <Field label="Title">
            <Input value={form.Title ?? ''} onChange={(e) => setForm({ ...form, Title: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={form.Description ?? ''} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
          </Field>
          <AIPromptBox kind="idea" label="AI Suggestions" onPick={(s) => setForm((f) => ({ ...f, Description: s }))} />
          <Field label="Category">
            <Select
              value={form.Category ?? ''}
              onChange={(e) => setForm({ ...form, Category: e.target.value as Idea['Category'] })}
            >
              <option value="">— select —</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Theme">
              <Input value={form.Theme ?? ''} onChange={(e) => setForm({ ...form, Theme: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={form.Tagline ?? ''} onChange={(e) => setForm({ ...form, Tagline: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AIPromptBox kind="theme" label="AI Theme Ideas" onPick={(s) => setForm((f) => ({ ...f, Theme: s }))} />
            <AIPromptBox kind="tagline" label="AI Tagline Ideas" onPick={(s) => setForm((f) => ({ ...f, Tagline: s }))} />
          </div>
          {submitError && <p className="text-xs text-red-600">{submitError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setActiveScope(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isMutating || !form.Title}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
