import { useState } from 'react';
import { Plus, Loader2, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { useEntityData } from '@/hooks/useEntityData';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Field, Input, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { FileUploadField } from './FileUploadField';
import type { EntityName } from '@/types';

export interface FieldConfig<T> {
  key: keyof T & string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'file' | 'date';
  options?: readonly string[]; // for type='select'
  hideInTable?: boolean; // long fields (e.g. Benefits/Description) shown in the modal only, not as a column
  readOnly?: boolean; // renders as a disabled input instead of an editable control
  computed?: (form: Partial<T>) => number; // live-recomputed from current form state; implies readOnly
}

export interface EntityCrudTableProps<T extends object> {
  entity: EntityName;
  title: string;
  fields: FieldConfig<T>[];
  eventId?: string; // scopes the list + auto-injects EventID on create
  sortBy?: keyof T & string;
  addLabel?: string;
}

function formatIDR(value: unknown) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}

/**
 * Config-driven CRUD table — the successor to the old RosterModuleScreen
 * "one shared component, prop-configured" pattern, generalized to back any
 * of the several structurally-similar entities (comparison/booking modules,
 * Rundown, Finance Incoming) without a bespoke file per entity.
 */
export function EntityCrudTable<T extends object>({
  entity,
  title,
  fields,
  eventId,
  sortBy,
  addLabel,
}: EntityCrudTableProps<T>) {
  const { items, idField, isLoading, create, update, remove, isMutating } = useEntityData<T>(entity, { eventId });
  const { canWrite } = usePermissions();
  const editable = canWrite(entity);

  const emptyForm = (): Partial<T> => {
    const f = {} as Partial<T>;
    fields.forEach((fc) => {
      (f as Record<string, unknown>)[fc.key] = fc.type === 'number' ? 0 : fc.type === 'select' ? fc.options?.[0] ?? '' : '';
    });
    if (eventId) (f as Record<string, unknown>).EventID = eventId;
    return f;
  };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Partial<T>>(emptyForm());

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (item: T) => {
    setEditing(item);
    setForm(item);
    setOpen(true);
  };
  const save = async () => {
    if (editing) await update(String(editing[idField]), form);
    else await create(form);
    setOpen(false);
  };

  const setFieldValue = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }) as Partial<T>);

  const sorted = sortBy
    ? [...items].sort((a, b) => String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? '')))
    : items;

  const tableFields = fields.filter((f) => !f.hideInTable);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {editable && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {addLabel ?? 'Add'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink/50 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-ink/40 py-10 text-center">Nothing here yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50 text-xs uppercase tracking-wide">
                {tableFields.map((f) => (
                  <th key={f.key} className={`px-4 py-3 ${f.type === 'number' ? 'text-right' : ''}`}>
                    {f.label}
                  </th>
                ))}
                {editable && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={String(item[idField])} className="border-b border-ink/5 last:border-0 hover:bg-paper/60">
                  {tableFields.map((f) => (
                    <td
                      key={f.key}
                      className={`px-4 py-3 ${f.type === 'number' ? 'text-right tabular-nums' : 'text-ink/70'}`}
                    >
                      {f.type === 'number' ? (
                        formatIDR(item[f.key])
                      ) : f.type === 'file' ? (
                        item[f.key] ? (
                          <a
                            href={String(item[f.key])}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-guava hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </a>
                        ) : (
                          '—'
                        )
                      ) : (
                        String(item[f.key] ?? '') || '—'
                      )}
                    </td>
                  ))}
                  {editable && (
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => openEdit(item)} className="text-ink/40 hover:text-ink">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(String(item[idField]))} className="text-ink/40 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${title}` : `Add ${title}`}>
        <div className="space-y-3">
          {fields.map((f) => {
            const value = form[f.key];
            // A stored value that isn't in `options` (a since-removed committee member,
            // a renamed status) would render as a blank dropdown hiding a real value.
            const opts = f.options ?? [];
            const selectOpts =
              typeof value === 'string' && value && !opts.includes(value) ? [value, ...opts] : opts;
            return (
              <Field key={f.key} label={f.label}>
                {f.computed ? (
                  <Input type="text" disabled value={formatIDR(f.computed(form))} onChange={() => {}} />
                ) : f.type === 'textarea' ? (
                  <Textarea
                    disabled={f.readOnly}
                    value={(value as string) ?? ''}
                    onChange={(e) => setFieldValue(f.key, e.target.value)}
                  />
                ) : f.type === 'select' ? (
                  <Select
                    disabled={f.readOnly}
                    value={(value as string) ?? ''}
                    onChange={(e) => setFieldValue(f.key, e.target.value)}
                  >
                    {selectOpts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                ) : f.type === 'number' ? (
                  <Input
                    type="number"
                    disabled={f.readOnly}
                    value={(value as number) ?? 0}
                    onChange={(e) => setFieldValue(f.key, Number(e.target.value))}
                  />
                ) : f.type === 'file' ? (
                  <FileUploadField value={(value as string) ?? ''} onChange={(url) => setFieldValue(f.key, url)} />
                ) : f.type === 'date' ? (
                  <Input
                    type="date"
                    disabled={f.readOnly}
                    value={(value as string) ?? ''}
                    onChange={(e) => setFieldValue(f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    disabled={f.readOnly}
                    value={(value as string) ?? ''}
                    onChange={(e) => setFieldValue(f.key, e.target.value)}
                  />
                )}
              </Field>
            );
          })}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
