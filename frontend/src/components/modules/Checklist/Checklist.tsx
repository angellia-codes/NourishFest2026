import { useState } from 'react';
import { Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useSheetData } from '@/hooks/useSheetData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import type { ChecklistTask, Phase, Priority, TaskStatus } from '@/types';

const COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Done', 'Blocked'];
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

const PRIORITY_TONE: Record<Priority, 'neutral' | 'info' | 'warning' | 'danger'> = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
};

/** phase='Pre-Event' | 'Main Event'; module lets a screen scope to e.g. only "Entertainment" tasks */
export function ChecklistBoard({ phase, moduleFilter, title }: { phase: Phase; moduleFilter?: string; title: string }) {
  const filters: Record<string, string> = { Phase: phase };
  if (moduleFilter) filters.Module = moduleFilter;

  const { items, isLoading, create, update, remove, isMutating } = useSheetData<ChecklistTask>('Checklist', filters);
  const { can } = usePermissions();
  const canEdit = can('Checklist', 'Editor');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ChecklistTask>>({
    Task: '',
    Assignee: '',
    Deadline: '',
    Priority: 'Medium',
    Status: 'To Do',
    Module: moduleFilter ?? '',
  });

  const submit = async () => {
    await create({ ...form, Phase: phase });
    setForm({ Task: '', Assignee: '', Deadline: '', Priority: 'Medium', Status: 'To Do', Module: moduleFilter ?? '' });
    setOpen(false);
  };

  const isOverdue = (task: ChecklistTask) =>
    task.Deadline && task.Status !== 'Done' && new Date(task.Deadline) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-ink/50">{phase} checklist{moduleFilter ? ` · ${moduleFilter}` : ''}</p>
        </div>
        {canEdit && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const tasks = items.filter((t) => t.Status === col);
            return (
              <div key={col} className="rounded-xl bg-muted/60 p-3 space-y-2 min-h-[200px]">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{col}</p>
                  <span className="text-xs text-ink/40">{tasks.length}</span>
                </div>
                {tasks.map((task) => (
                  <div key={task.Id} className="rounded-lg bg-white border border-ink/10 p-3 space-y-2 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{task.Task}</p>
                      {canEdit && (
                        <button onClick={() => remove(task.Id)} className="text-ink/25 hover:text-red-600 shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge tone={PRIORITY_TONE[task.Priority]}>{task.Priority}</Badge>
                      {isOverdue(task) && (
                        <Badge tone="danger">
                          <AlertTriangle className="h-3 w-3 mr-1 inline" /> Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink/50">
                      {task.Assignee || 'Unassigned'} {task.Deadline && `· due ${task.Deadline}`}
                    </p>
                    {canEdit && (
                      <Select
                        value={task.Status}
                        onChange={(e) => update(task.Id, { Status: e.target.value as TaskStatus })}
                        className="!py-1 text-xs"
                      >
                        {COLUMNS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Task">
        <div className="space-y-3">
          <Field label="Task">
            <Input value={form.Task ?? ''} onChange={(e) => setForm({ ...form, Task: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee">
              <Input value={form.Assignee ?? ''} onChange={(e) => setForm({ ...form, Assignee: e.target.value })} />
            </Field>
            <Field label="Deadline">
              <Input
                type="date"
                value={form.Deadline ?? ''}
                onChange={(e) => setForm({ ...form, Deadline: e.target.value })}
              />
            </Field>
            <Field label="Priority">
              <Select value={form.Priority} onChange={(e) => setForm({ ...form, Priority: e.target.value as Priority })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Module">
              <Input
                value={form.Module ?? ''}
                onChange={(e) => setForm({ ...form, Module: e.target.value })}
                placeholder="e.g. Entertainment"
                disabled={!!moduleFilter}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.Notes ?? ''} onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isMutating || !form.Task}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
