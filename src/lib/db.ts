import { supabase } from "@/integrations/supabase/client";
import type {
  ChargingSession,
  MaintenanceRecord,
  Trip,
  Vehicle,
} from "@/lib/ev";

/**
 * Minimal structural view of the Supabase client so the generic repository
 * factory below stays free of `any`; the generated typed client is what runs.
 */
type Result = { data: unknown; error: { message: string } | null };
type Query = PromiseLike<Result> & {
  select: (columns?: string) => Query;
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => Query;
  update: (values: Record<string, unknown>) => Query;
  delete: () => Query;
  eq: (column: string, value: unknown) => Query;
  is: (column: string, value: unknown) => Query;
  order: (column: string, options?: { ascending?: boolean }) => Query;
  limit: (count: number) => Query;
};

const db = supabase as unknown as { from: (table: string) => Query };

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
  const one = async (query: Query, failure: string): Promise<T> => {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    const row = rows[0];
    if (!row) throw new Error(failure);
    return row;
  };

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
    create(values) {
      return one(
        db.from(table).insert(values).select("*").limit(1),
        "No se ha podido guardar el registro",
      );
    },
    update(id, values) {
      return one(
        db.from(table).update(values).eq("id", id).select("*").limit(1),
        "No se ha encontrado el registro",
      );
    },
    async remove(id) {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

export const vehiclesRepo = makeRepo<Vehicle>("vehicles", "created_at");
export const chargesRepo = makeRepo<ChargingSession>("charging_sessions", "occurred_at");
export const tripsRepo = makeRepo<Trip>("trips", "occurred_at");
export const maintenanceRepo = makeRepo<MaintenanceRecord>(
  "maintenance_records",
  "occurred_at",
);

export async function deleteInsight(id: string): Promise<void> {
  const { error } = await db.from("insights").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
