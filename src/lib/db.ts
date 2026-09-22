import { supabase } from "@/integrations/supabase/client";

/**
 * Minimal structural view of the Supabase client. Keeps the generic repository
 * factory below free of `any` while the generated typed client is what actually
 * runs at runtime.
 */
type Result = { data: unknown; error: { message: string } | null };
type Step = {
  eq: (column: string, value: unknown) => Step;
  order: (column: string, options?: { ascending?: boolean }) => Step;
  limit: (count: number) => Step;
};
type Awaitable = PromiseLike<Result> & {
  select: (columns?: string) => Step & Awaitable;
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => Step & Awaitable;
  update: (values: Record<string, unknown>) => Step & Awaitable;
  delete: () => Step & Awaitable;
};

const db = supabase as unknown as { from: (table: string) => Awaitable };

export type Repo<T> = {
  key: string;
  list: () => Promise<T[]>;
  create: (values: Record<string, unknown>) => Promise<T>;
  update: (id: string, values: Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

function makeRepo<T extends { id: string }>(
  table: string,
  orderColumn: string,
): Repo<T> {
  return {
    key: table,
    async list() {
      const { data, error } = await db
        .from(table)
        .select("*")
        .order(orderColumn, { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
    async create(values) {
      const { data, error } = await db.from(table).insert(values).select("*").limit(1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as T[];
      if (!rows.length) throw new Error("No se ha podido guardar el registro");
      return rows[0];
    },
    async update(id, values) {
      const { data, error } = await db
        .from(table)
        .update(values)
        .eq("id", id)
        .select("*")
        .limit(1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as T[];
      if (!rows.length) throw new Error("No se ha encontrado el registro");
      return rows[0];
    },
    async remove(id) {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

import type {
  ChargingSession,
  MaintenanceRecord,
  Trip,
  Vehicle,
} from "@/lib/ev";

export const vehiclesRepo = makeRepo<Vehicle>("vehicles", "created_at");
export const chargesRepo = makeRepo<ChargingSession>("charging_sessions", "started_at");
export const tripsRepo = makeRepo<Trip>("trips", "started_at");
export const maintenanceRepo = makeRepo<MaintenanceRecord>(
  "maintenance_records",
  "performed_at",
);

export async function dismissInsight(id: string): Promise<void> {
  const { error } = await db
    .from("insights")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteInsight(id: string): Promise<void> {
  const { error } = await db.from("insights").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
