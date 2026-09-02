'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/EmptyState';
import { Field, Input, SearchInput, Select, Textarea, Toggle } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useResourceList, useResourceMutation } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { downloadCsv, toCsv } from '@/lib/csv';
import { imageUrl } from '@/lib/format';
import type { CatalogRecord } from '@/lib/types';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'toggle'
  | 'select'
  | 'tags'
  | 'image'
  | 'color'
  | 'date';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Full width inside the two-column form grid. */
  full?: boolean;
  defaultValue?: unknown;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface ResourcePageProps<T extends CatalogRecord> {
  title: string;
  subtitle: string;
  /** API path under `/admin`, e.g. `food/restaurants`. */
  path: string;
  /** Key inside the response payload, e.g. `restaurants`. */
  responseKey: string;
  singular: string;
  columns: Column<T>[];
  fields: FieldDef[];
  filters?: FilterDef[];
  searchPlaceholder?: string;
  /** Extra static query sent with every list request. */
  baseQuery?: Record<string, string | number | boolean | undefined>;
  /** Buttons rendered before Edit/Delete on every row (e.g. "Issue"). */
  rowActions?: (row: T) => ReactNode;
  /** Extra buttons next to Export / Add in the page header. */
  headerActions?: ReactNode;
}

function emptyForm(fields: FieldDef[]): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) form[field.name] = field.defaultValue;
    else if (field.type === 'toggle') form[field.name] = false;
    else if (field.type === 'number') form[field.name] = '';
    else form[field.name] = '';
  }
  return form;
}

function rowToForm(fields: FieldDef[], row: CatalogRecord): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = row[field.name];
    if (field.type === 'tags') form[field.name] = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
    else if (field.type === 'image') form[field.name] = imageUrl(raw) ?? '';
    else if (field.type === 'toggle') form[field.name] = Boolean(raw);
    else if (field.type === 'date') form[field.name] = raw ? String(raw).slice(0, 10) : '';
    else form[field.name] = raw === null || raw === undefined ? '' : raw;
  }
  return form;
}

function formToPayload(fields: FieldDef[], form: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = form[field.name];
    if (field.type === 'number') {
      payload[field.name] = value === '' || value === null ? 0 : Number(value);
    } else if (field.type === 'tags') {
      payload[field.name] = String(value ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    } else if (field.type === 'image') {
      payload[field.name] = value ? { kind: 'uri', uri: String(value).trim() } : null;
    } else if (field.type === 'toggle') {
      payload[field.name] = Boolean(value);
    } else if (field.type === 'date') {
      // Empty date = "no bound"; the API stores null.
      payload[field.name] = value ? new Date(`${String(value)}T00:00:00`).toISOString() : null;
    } else {
      payload[field.name] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return payload;
}

/**
 * One screen, reused by every catalogue resource: searchable + filterable
 * table, create/edit modal built from a field schema, delete confirmation,
 * CSV export and pagination — all against `/api/v1/admin/<path>`.
 */
export function ResourcePage<T extends CatalogRecord>({
  title,
  subtitle,
  path,
  responseKey,
  singular,
  columns,
  fields,
  filters = [],
  searchPlaceholder = 'Search…',
  baseQuery,
  rowActions,
  headerActions,
}: ResourcePageProps<T>) {
  const toast = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(() => emptyForm(fields));
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(
    () => ({ q: debounced || undefined, page, limit: 20, ...baseQuery, ...filterValues }),
    [debounced, page, filterValues, baseQuery],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useResourceList<T>(path, responseKey, query);
  const { create, update, remove } = useResourceMutation(path);

  const openCreate = () => {
    setForm(emptyForm(fields));
    setFormError('');
    setCreating(true);
  };

  const openEdit = (row: T) => {
    setForm(rowToForm(fields, row));
    setFormError('');
    setEditing(row);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setFormError('');
  };

  const submit = async () => {
    setFormError('');
    const missing = fields.find((field) => field.required && !String(form[field.name] ?? '').trim());
    if (missing) {
      setFormError(`${missing.label} is required`);
      return;
    }

    const payload = formToPayload(fields, form);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: payload });
        logActivity({
          actor: user?.name ?? 'admin',
          action: `Updated ${singular.toLowerCase()}`,
          target: String(form.name ?? editing.id),
        });
        toast.success(`${singular} updated`);
      } else {
        await create.mutateAsync(payload);
        logActivity({
          actor: user?.name ?? 'admin',
          action: `Created ${singular.toLowerCase()}`,
          target: String(form.name ?? ''),
        });
        toast.success(`${singular} created`);
      }
      closeForm();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      logActivity({
        actor: user?.name ?? 'admin',
        action: `Deleted ${singular.toLowerCase()}`,
        target: String(deleting.name ?? deleting.id),
      });
      toast.success(`${singular} deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const exportCsv = () => {
    const rows = data?.rows ?? [];
    const cols = columns.map((column) => ({ key: column.key, label: column.label }));
    const flat = rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const column of columns) {
        record[column.key] = column.value ? column.value(row) : (row as CatalogRecord)[column.key];
      }
      return record;
    });
    downloadCsv(`aurasure-${path.replace('/', '-')}-${new Date().toISOString().slice(0, 10)}`, toCsv(flat, cols));
    toast.info(`Exported ${flat.length} rows`);
  };

  const setValue = (name: string, value: unknown) => setForm((prev) => ({ ...prev, [name]: value }));

  const formBody = (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const value = form[field.name];
        const control = (() => {
          switch (field.type) {
            case 'textarea':
              return (
                <Textarea
                  value={String(value ?? '')}
                  placeholder={field.placeholder}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              );
            case 'number':
              return (
                <Input
                  type="number"
                  step="any"
                  value={String(value ?? '')}
                  placeholder={field.placeholder}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              );
            case 'select':
              return (
                <Select value={String(value ?? '')} onChange={(event) => setValue(field.name, event.target.value)}>
                  <option value="">Select…</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              );
            case 'toggle':
              return (
                <div className="flex h-10 items-center gap-2.5">
                  <Toggle checked={Boolean(value)} onChange={(next) => setValue(field.name, next)} label={field.label} />
                  <span className="text-[13px] text-ink-500">{value ? 'Enabled' : 'Disabled'}</span>
                </div>
              );
            case 'color':
              return (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(value || '#5b46e5')}
                    onChange={(event) => setValue(field.name, event.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-[var(--color-line-strong)] bg-white p-1"
                  />
                  <Input value={String(value ?? '')} onChange={(event) => setValue(field.name, event.target.value)} />
                </div>
              );
            case 'date':
              return (
                <Input
                  type="date"
                  value={String(value ?? '')}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              );
            case 'image':
              return (
                <ImageUpload
                  label={field.label}
                  value={String(value ?? '')}
                  onChange={(url) => setValue(field.name, url)}
                />
              );
            default:
              return (
                <Input
                  value={String(value ?? '')}
                  placeholder={field.placeholder}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              );
          }
        })();

        return (
          <Field
            key={field.name}
            label={field.label}
            hint={field.hint}
            required={field.required}
            className={field.full || field.type === 'textarea' || field.type === 'image' ? 'sm:col-span-2' : undefined}
          >
            {control}
          </Field>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {headerActions}
            <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv} disabled={!data?.rows.length}>
              Export
            </Button>
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              Add {singular.toLowerCase()}
            </Button>
          </>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:p-5">
          <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder} className="flex-1" />
          {filters.map((filter) => (
            <Select
              key={filter.key}
              aria-label={filter.label}
              value={filterValues[filter.key] ?? ''}
              onChange={(event) => {
                setFilterValues((prev) => ({ ...prev, [filter.key]: event.target.value }));
                setPage(1);
              }}
              className="sm:w-52"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ))}
        </div>

        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.rows ?? []}
              rowKey={(row) => row.id}
              loading={isLoading}
              refreshing={isFetching && !isLoading}
              emptyTitle={`No ${title.toLowerCase()} yet`}
              emptyMessage="Create the first record or clear the filters."
              emptyAction={
                <Button icon={<Plus size={16} />} onClick={openCreate}>
                  Add {singular.toLowerCase()}
                </Button>
              }
              actions={(row) => (
                <>
                  {rowActions?.(row)}
                  <Button size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => setDeleting(row)}>
                    Delete
                  </Button>
                </>
              )}
            />
          )}
        </div>

        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        onClose={closeForm}
        title={editing ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
        subtitle={editing ? `ID ${editing.id}` : 'Saved straight to the Aurasure database.'}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={submit} loading={create.isPending || update.isPending}>
              {editing ? 'Save changes' : `Create ${singular.toLowerCase()}`}
            </Button>
          </>
        }
      >
        {formError ? (
          <p className="mb-4 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
            {formError}
          </p>
        ) : null}
        {formBody}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete this ${singular.toLowerCase()}?`}
        message={
          <>
            <span className="font-medium text-ink-800">{String(deleting?.name ?? deleting?.id ?? '')}</span> will be
            removed from the database. Customers will stop seeing it in the app immediately.
          </>
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
