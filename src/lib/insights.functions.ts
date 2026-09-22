import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai-gateway.server";

const InsightDraft = z.object({
  insights: z.array(
    z.object({
      kind: z.enum(["anomaly", "trend", "forecast", "tip"]),
      severity: z.enum(["info", "watch", "alert"]),
      title: z.string(),
      body: z.string(),
    }),
  ),
});

function summarise(charges: unknown[], trips: unknown[], maintenance: unknown[]) {
  return JSON.stringify(
    {
      charges: charges.slice(0, 120),
      trips: trips.slice(0, 120),
      maintenance: maintenance.slice(0, 40),
    },
    null,
    0,
  ).slice(0, 24_000);
}

/**
 * Reads the user's own records and asks the model for a short health report,
 * storing each finding as an insight row.
 */
export const runHealthCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave de Lovable AI");

    const { supabase, userId } = context;

    const [charges, trips, maintenance, vehicle] = await Promise.all([
      supabase
        .from("charging_sessions")
        .select("occurred_at, energy_kwh, cost_eur, price_per_kwh, charger_type, start_soc, end_soc, location_label")
        .order("occurred_at", { ascending: false })
        .limit(150),
      supabase
        .from("trips")
        .select("occurred_at, distance_km, energy_kwh, start_soc, end_soc, label")
        .order("occurred_at", { ascending: false })
        .limit(150),
      supabase
        .from("maintenance_records")
        .select("occurred_at, category, title, cost_eur, mileage_km, next_due_at, next_due_km")
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabase.from("vehicles").select("*").order("created_at").limit(1).maybeSingle(),
    ]);

    const rows = charges.data ?? [];
    if (rows.length < 3 && (trips.data ?? []).length < 3) {
      return {
        created: 0,
        message:
          "Aún hay pocos datos para un análisis fiable. Registra algunas cargas o desplazamientos primero.",
      };
    }

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: InsightDraft }),
      system:
        "Eres el analista de flota de una app de gestión de coche eléctrico. " +
        "Recibes cargas, desplazamientos y mantenimiento de una persona. " +
        "Devuelve entre 2 y 5 hallazgos accionables en español. " +
        "Cada título tiene como máximo 60 caracteres y el cuerpo 2 frases. " +
        "Prioriza anomalías de consumo o precio, tendencias de salud de batería y avisos de mantenimiento próximos. " +
        "Si no hay señal suficiente, devuelve menos hallazgos en vez de inventarlos.",
      prompt: `Fecha de hoy: ${new Date().toISOString().slice(0, 10)}\nVehículo: ${JSON.stringify(vehicle.data)}\n\nDatos:\n${summarise(rows, trips.data ?? [], maintenance.data ?? [])}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const { insights } = await result.output;

    const payload = insights.slice(0, 5).map((insight) => ({
      user_id: userId,
      vehicle_id: vehicle.data?.id ?? null,
      kind: insight.kind,
      severity: insight.severity,
      title: insight.title.slice(0, 120),
      body: insight.body,
    }));

    if (!payload.length) {
      return { created: 0, message: "El análisis no ha encontrado nada que destacar." };
    }

    const { error } = await supabase.from("insights").insert(payload);
    if (error) throw new Error(error.message);

    return { created: payload.length, message: "Análisis completado." };
  });
