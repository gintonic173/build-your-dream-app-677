import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime, toDateInput, toLocalInput } from "@/lib/ev";
import { cn } from "@/lib/utils";

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "datetime" | "date" | "select" | "switch";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  hint?: string;
  half?: boolean;
};

type Writer = {
  create: { mutateAsync: (values: Record<string, unknown>) => Promise<unknown> };
  update: {
    mutateAsync: (args: { id: string; values: Record<string, unknown> }) => Promise<unknown>;
  };
  remove: { mutateAsync: (id: string) => Promise<unknown> };
};

type Props<T extends { id: string }> = {
  singular: string;
  description: string;
  fields: Field[];
  columns: { label: string; render: (row: T) => ReactNode; emphasize?: boolean }[];
  title: (row: T) => string;
  subtitle?: (row: T) => string;
  matches?: (row: T, query: string) => boolean;
  writer: Writer;
  rows: T[];
  loading: boolean;
  emptyHint?: string;
};

const UNSELECTED = "__none__";

function emptyForm(fields: Field[]): Record<string, string> {
  const form: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "datetime") form[field.name] = toLocalInput();
    else if (field.type === "date") form[field.name] = toDateInput();
    else if (field.type === "switch") form[field.name] = "false";
    else if (field.type === "select") form[field.name] = field.defaultValue ?? UNSELECTED;
    else form[field.name] = field.defaultValue ?? "";
  }
  return form;
}

function formFromRow(fields: Field[], row: Record<string, unknown>): Record<string, string> {
  const form = emptyForm(fields);
  for (const field of fields) {
    const raw = row[field.name];
    if (raw == null) continue;
    if (field.type === "datetime") form[field.name] = toLocalInput(new Date(String(raw)));
    else if (field.type === "date") form[field.name] = String(raw).slice(0, 10);
    else if (field.type === "switch") form[field.name] = raw ? "true" : "false";
    else form[field.name] = String(raw);
  }
  return form;
}

function toValues(fields: Field[], form: Record<string, string>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = form[field.name] ?? "";
    if (field.type === "switch") {
      values[field.name] = raw === "true";
    } else if (raw === "" || (field.type === "select" && raw === UNSELECTED)) {
      values[field.name] = null;
    } else if (field.type === "number") {
      values[field.name] = Number(raw.replace(",", "."));
    } else if (field.type === "datetime") {
      values[field.name] = new Date(raw).toISOString();
    } else if (field.type === "date") {
      values[field.name] = raw;
    } else {
      values[field.name] = raw;
    }
  }
  return values;
}

export function RecordManager<T extends { id: string }>({
  singular,
  description,
  fields,
  columns,
  title,
  subtitle,
  matches,
  writer,
  rows,
  loading,
  emptyHint,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm(fields));
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !matches) return rows;
    return rows.filter((row) => matches(row, term));
  }, [rows, query, matches]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm(fields));
    setOpen(true);
  }

  function startEdit(row: T) {
    setEditing(row);
    setForm(formFromRow(fields, row as unknown as Record<string, unknown>));
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const values = toValues(fields, form);
      if (editing) await writer.update.mutateAsync({ id: editing.id, values });
      else await writer.create.mutateAsync(values);
      toast.success(editing ? "Cambios guardados" : `${singular} registrado`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(row: T) {
    try {
      await writer.remove.mutateAsync(row.id);
      toast.success(`${singular} eliminado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido eliminar");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{singular}s</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="size-4" />
          Añadir
        </Button>
      </header>

      {matches && rows.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar"
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="panel space-y-3 p-5">
          {[0, 1, 2].map((index) => (
            <div key={index} className="scan-line h-12 rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="font-medium">
            {rows.length ? "Ningún resultado coincide con la búsqueda" : `Todavía no hay ${singular.toLowerCase()}s`}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {rows.length ? "Prueba con otro término." : (emptyHint ?? "Añade el primero con el botón de arriba, o pídeselo al asistente.")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((row) => (
            <article
              key={row.id}
              className="panel-tight group flex items-center gap-4 px-4 py-3 transition-colors hover:border-energy/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title(row)}</p>
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle(row)}</p>
                )}
              </div>

              <div className="hidden items-center gap-6 sm:flex">
                {columns.map((column) => (
                  <div key={column.label} className="w-24 text-right">
                    <p className="eyebrow mb-1 hidden lg:block">{column.label}</p>
                    <p
                      className={cn(
                        "readout text-sm",
                        column.emphasize ? "text-energy" : "text-foreground",
                      )}
                    >
                      {column.render(row)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => startEdit(row)}
                  aria-label={`Editar ${title(row)}`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(row)}
                  aria-label={`Eliminar ${title(row)}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${singular}` : `Nuevo ${singular}`}</DialogTitle>
            <DialogDescription>
              Los campos vacíos se guardan sin valor, así puedes completarlos más tarde.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn("space-y-1.5", field.half ? "col-span-2 sm:col-span-1" : "col-span-2")}
              >
                <Label htmlFor={field.name}>{field.label}</Label>

                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    rows={3}
                    placeholder={field.placeholder}
                    value={form[field.name] ?? ""}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={form[field.name] ?? UNSELECTED}
                    onValueChange={(value) => setForm({ ...form, [field.name]: value })}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSELECTED}>Sin especificar</SelectItem>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "switch" ? (
                  <div className="flex h-9 items-center gap-2">
                    <input
                      id={field.name}
                      type="checkbox"
                      checked={form[field.name] === "true"}
                      onChange={(event) =>
                        setForm({ ...form, [field.name]: event.target.checked ? "true" : "false" })
                      }
                      className="size-4 accent-energy"
                    />
                    <span className="text-sm text-muted-foreground">{field.hint}</span>
                  </div>
                ) : (
                  <Input
                    id={field.name}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "datetime"
                          ? "datetime-local"
                          : field.type === "date"
                            ? "date"
                            : "text"
                    }
                    step={field.type === "number" ? "any" : undefined}
                    min={field.type === "number" ? 0 : undefined}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={form[field.name] ?? ""}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                  />
                )}

                {field.hint && field.type !== "switch" && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}

            <DialogFooter className="col-span-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { formatDate, formatDateTime };
