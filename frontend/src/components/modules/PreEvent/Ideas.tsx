import { useState } from 'react';
import { Plus, ThumbsUp, Loader2, Trash2 } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { AIPromptBox } from '@/components/ai/AIPromptBox';
import type { Idea, IdeaStatus } from '@/types';

const STATUSES: IdeaStatus[] = ['New', 'Under Review', 'Approved', 'Rejected', 'Implemented'];

const STATUS_TONE: Record<IdeaStatus, 'neutral' | 'info' | 'success' | 'danger' | 'brand'> = {
  New: 'neutral',
  'Under Review': 'info',
  Approved: 'success',
  Rejected: 'danger',
  Implemented: 'brand',
};

export function IdeasBoard() {
  const { items, isLoading, create, update, remove, isMutating } = useSheetData<Idea>('Ideas');
  const { can, email } = usePermissions();
  const canEdit = can('Ideas', 'Editor');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Idea>>({ Title: '', Description: '', Category: '', Status: 'New', Votes: 0 });

  const submit = async () => {
    await create({ ...form, SubmittedBy: email, Votes: 0, Status: 'New' });
    setForm({ Title: '', Description: '', Category: '', Status: 'New', Votes: 0 });
    setOpen(false);
  };

  const vote = (idea: Idea) => update(idea.Id, { Votes: Number(idea.Votes || 0) + 1 });

  const addAiIdea = (suggestion: string) =>
    create({ Title: suggestion, Description: 'AI-suggested — refine as needed.', Category: 'AI Suggestion', SubmittedBy: email, Votes: 0, Status: 'New' });

  const sorted = [...items].sort((a, b) => Number(b.Votes) - Number(a.Votes));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Ideas</h2>
          <p className="text-sm text-ink/50">Ranked by votes — anyone with access can upvote.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Submit Idea
        </Button>
      </div>

      <AIPromptBox kind="idea" label="AI idea suggestions" placeholder="e.g. team bonding, low-budget, kid-friendly…" onPick={addAiIdea} />

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ideas…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((idea) => (
            <div key={idea.Id} className="rounded-xl border border-ink/10 bg-white p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-snug">{idea.Title}</h3>
                <Badge tone={STATUS_TONE[idea.Status] ?? 'neutral'}>{idea.Status}</Badge>
              </div>
              <p className="text-sm text-ink/60 flex-1">{idea.Description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-ink/5 text-xs text-ink/50">
                <span>{idea.Category || 'Uncategorized'} · by {idea.SubmittedBy || 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => vote(idea)}
                    className="flex items-center gap-1 rounded-full bg-jungle/10 text-jungle px-2 py-1 hover:bg-jungle/20 font-medium"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> {idea.Votes ?? 0}
                  </button>
                  {canEdit && (
                    <>
                      <Select
                        value={idea.Status}
                        onChange={(e) => update(idea.Id, { Status: e.target.value as IdeaStatus })}
                        className="!w-auto text-xs !py-1"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                      <button onClick={() => remove(idea.Id)} className="text-ink/30 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Submit an Idea">
        <div className="space-y-3">
          <Field label="Title">
            <Input value={form.Title ?? ''} onChange={(e) => setForm({ ...form, Title: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={form.Description ?? ''} onChange={(e) => setForm({ ...form, Description: e.target.value })} />
          </Field>
          <Field label="Category">
            <Input value={form.Category ?? ''} onChange={(e) => setForm({ ...form, Category: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
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
