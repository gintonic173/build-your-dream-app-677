import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  chargesRepo,
  deleteInsight,
  dismissInsight,
  maintenanceRepo,
  tripsRepo,
  vehiclesRepo,
  type Repo,
} from "@/lib/db";
import type {
  ChargingSession,
  Insight,
  MaintenanceRecord,
  Trip,
  Vehicle,
} from "@/lib/ev";

export const keys = {
  vehicles: ["vehicles"] as const,
  charges: ["charges"] as const,
  trips: ["trips"] as const,
  maintenance: ["maintenance"] as const,
  insights: ["insights"] as const,
  chat: ["chat"] as const,
};

function useList<T>(queryKey: readonly unknown[], repo: Repo<T>) {
  return useQuery({
    queryKey,
    queryFn: repo.list,
    staleTime: 30_000,
  });
}

export const useVehicles = () => useList(keys.vehicles, vehiclesRepo);
export const useCharges = () => useList(keys.charges, chargesRepo);
export const useTrips = () => useList(keys.trips, tripsRepo);
export const useMaintenance = () => useList(keys.maintenance, maintenanceRepo);

export function useInsights() {
  return useQuery({
    queryKey: keys.insights,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .is("dismissed_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Insight[];
    },
  });
}

/** Loads the single, continuous assistant conversation. */
export function useChatHistory() {
  return useQuery({
    queryKey: keys.chat,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("content")
        .order("id", { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((row) => (row as { content: unknown }).content)
        .filter(Boolean);
    },
  });
}

export function useRecordWriter<T extends { id: string }>(
  queryKey: readonly unknown[],
  repo: Repo<T>,
) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) => repo.create(values),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      repo.update(id, values),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => repo.remove(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export function useInsightActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.insights });

  return {
    dismiss: useMutation({ mutationFn: dismissInsight, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: deleteInsight, onSuccess: invalidate }),
  };
}

export type { ChargingSession, MaintenanceRecord, Trip, Vehicle };
