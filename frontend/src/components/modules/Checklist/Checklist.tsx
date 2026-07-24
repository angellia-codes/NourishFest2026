import { useState } from 'react';
import { Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { useSelectedEvent } from '@/context/SelectedEventContext';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { EventRequiredNotice } from '@/components/shared/EventRequiredNotice';
import { CHECKLIST_STATUSES, type Checklist } from '@/types';

const EMPTY: Partial<Checklist> = { ToDo: '', Assignee: '', DueDate: '', Status: 'To Do', Remark: '' };

export function ChecklistPreEventScreen() {
  const { preEventId } = useSelectedEvent();
  return <ChecklistBoard eventId={preEventId} title="Checklist — Pre-Event" />;
}

export function ChecklistMainEventScreen() {
  const { mainEventId } = useSelectedEvent();
  return <ChecklistBoard eventId={mainEventId} title="Checklist — Main Event" />;
}

export function ChecklistBoard({ eventId, title }: { eventId: string | null; title: string }) {
  if (!eventId) return <EventRequiredNotice />;
  return <ChecklistBoardInner eventId={eventId} title={title} />;
}

function ChecklistBoardInner({ eventId, title }: { eventId: string; title: string }) {
  const { items, isLoading, create, update, remove, isMutating } = useEntityData<Checklist>('Checklist', { eventId });
  const { accessLevel, email } = usePermissions();
  const level = accessLevel('Checklist');
  const canManage = level === 'write'; // create/delete + edit any task
  const isMember = level === 'special'; // can only patch Status/Remark on own-assigned tasks

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Checklist>>(EMPTY);

  const submit = async () => {
    await create({ ...form, EventID: eventId });
    setForm(EMPTY);
    setOpen(false);
  };

  const isOverdue = (task: Checklist) => !!task.DueDate && task.Status !== 'Done' && new Date(task.DueDate) < new Date();
  const canEditTask = (task: Checklist) => canManage || (isMember && task.Assignee === email);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {canManage && (
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
          {CHECKLIST_STATUSES.map((col) => {
            const tasks = items.filter((t) => t.Status === col);
            return (
              <div key={col} className="rounded-xl bg-muted/60 p-3 space-y-2 min-h-[200px]">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{col}</p>
                  <span className="text-xs text-ink/40">{tasks.length}</span>
                </div>
                {tasks.map((task) => {
                  const editable = canEditTask(task);
                  return (
                    <div key={task.TaskID} className="rounded-lg bg-white border border-ink/10 p-3 space-y-2 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{task.ToDo}</p>
                        {canManage && (
                          <button onClick={() => remove(task.TaskID)} className="text-ink/25 hover:text-red-600 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {isOverdue(task) && (
                        <Badge tone="danger">
                          <AlertTriangle className="h-3 w-3 mr-1 inline" /> Overdue
                        </Badge>
                      )}
                      <p className="text-xs text-ink/50">
                        {task.Assignee || 'Unassigned'} {task.DueDate && `· due ${task.DueDate}`}
                      </p>
                      {task.Remark && <p className="text-xs text-ink/60 italic">"{task.Remark}"</p>}
                      {editable && (
                        <>
                          <Select
                            value={task.Status}
                            onChange={(e) => update(task.TaskID, { Status: e.target.value })}
                            className="!py-1 text-xs"
                          >
                            {CHECKLIST_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Select>
                          <Input
                            placeholder="Remark"
                            defaultValue={task.Remark}
                            onBlur={(e) => {
                              if (e.target.value !== task.Remark) update(task.TaskID, { Remark: e.target.value });
                            }}
                            className="text-xs !py-1"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Task">
        <div className="space-y-3">
          <Field label="To Do">
            <Input value={form.ToDo ?? ''} onChange={(e) => setForm({ ...form, ToDo: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee (email)">
              <Input value={form.Assignee ?? ''} onChange={(e) => setForm({ ...form, Assignee: e.target.value })} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={form.DueDate ?? ''} onChange={(e) => setForm({ ...form, DueDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Remark">
            <Textarea value={form.Remark ?? ''} onChange={(e) => setForm({ ...form, Remark: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isMutating || !form.ToDo}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
