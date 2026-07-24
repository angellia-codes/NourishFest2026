import { useState } from 'react';
import { Plus, ThumbsUp, Loader2, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { IDEA_SCOPES, type Idea, type IdeaScope, type IdeaStatus } from '@/types';

const STATUSES: IdeaStatus[] = ['New', 'Under Review', 'Approved', 'Rejected', 'Implemented'];

const STATUS_TONE: Record<IdeaStatus, 'neutral' | 'info' | 'success' | 'danger' | 'brand'> = {
  New: 'neutral',
  'Under Review': 'info',
  Approved: 'success',
  Rejected: 'danger',
  Implemented: 'brand',
};

interface IdeaCardProps {
  idea: Idea;
  canManage: boolean;
  canVote: boolean;
  onVote: (idea: Idea) => void;
  onStatusChange: (idea: Idea, status: IdeaStatus) => void;
  onRemove: (idea: Idea) => void;
}

function IdeaCard({ idea, canManage, canVote, onVote, onStatusChange, onRemove }: IdeaCardProps) {
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
          <button
            onClick={() => canVote && onVote(idea)}
            disabled={!canVote}
            className="flex items-center gap-1 rounded-full bg-jungle/10 text-jungle px-2 py-1 hover:bg-jungle/20 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ThumbsUp className="h-3.5 w-3.5" /> {idea.Votes ?? 0}
          </button>
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
  const { accessLevel, canWrite, tier } = usePermissions();
  const qc = useQueryClient();
  const level = accessLevel('Ideas');
  const canSubmit = level === 'write' || level === 'special';
  const canManage = canWrite('Ideas');
  const canVote = tier === 'Admin' || tier === 'Member'; // backend hard-blocks Advisor/none regardless of the entity matrix

  const voteMutation = useMutation({
    mutationFn: (ideaId: string) => api.vote(ideaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['Ideas'] }),
  });

  const [activeScope, setActiveScope] = useState<IdeaScope | null>(null);
  const [form, setForm] = useState<Partial<Idea>>({ Title: '', Description: '', Theme: '', Tagline: '' });
  const [submitError, setSubmitError] = useState('');

  const openFor = (scope: IdeaScope) => {
    setActiveScope(scope);
    setForm({ Title: '', Description: '', Theme: '', Tagline: '' });
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

  const vote = (idea: Idea) => voteMutation.mutate(idea.IdeaID);
  const setStatus = (idea: Idea, status: IdeaStatus) => update(idea.IdeaID, { Status: status });
  const removeIdea = (idea: Idea) => remove(idea.IdeaID);

  const forScope = (scope: IdeaScope) =>
    [...items].filter((i) => i.Scope === scope).sort((a, b) => Number(b.Votes) - Number(a.Votes));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">Ideas</h2>
        <p className="text-sm text-ink/50">Ranked by votes — one submission per person per event.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ideas…
        </div>
      ) : (
        IDEA_SCOPES.map((section) => (
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
                  canVote={canVote}
                  onVote={vote}
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Theme">
              <Input value={form.Theme ?? ''} onChange={(e) => setForm({ ...form, Theme: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={form.Tagline ?? ''} onChange={(e) => setForm({ ...form, Tagline: e.target.value })} />
            </Field>
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
