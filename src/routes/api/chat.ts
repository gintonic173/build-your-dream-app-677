import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = [
  "Eres Voltio, el asistente de control de un coche eléctrico.",
  "Hablas español, eres directo y usas unidades claras (kWh, km, €, Wh/km).",
  "Antes de responder sobre datos de la persona, consulta las herramientas; nunca inventes cifras.",
  "Si falta un dato, di qué falta y cómo registrarlo.",
  "Cuando registres algo por encargo, confirma en una línea lo que has guardado.",
  "Si no hay vehículo dado de alta, pide que lo cree en Ajustes antes de guardar nada.",
].join(" ");

const limitSchema = z.object({
  limit: z.number().int().nullable().describe("Cuántos registros devolver (opcional)"),
});

const chargeSchema = z.object({
  occurred_at: z.string().describe("Fecha y hora de la carga en ISO 8601"),
  energy_kwh: z.number().describe("Energía cargada en kWh"),
  cost_eur: z.number().nullable().describe("Coste total en euros"),
  price_per_kwh: z.number().nullable().describe("Precio por kWh en euros"),
  charger_type: z
    .string()
    .nullable()
    .describe("home, work, ac, dc o ultra"),
  start_soc: z.number().nullable().describe("Porcentaje de batería al inicio"),
  end_soc: z.number().nullable().describe("Porcentaje de batería al final"),
  location_label: z.string().nullable().describe("Dónde se ha cargado"),
  note: z.string().nullable().describe("Nota libre"),
});

const tripSchema = z.object({
  occurred_at: z.string().describe("Fecha y hora del desplazamiento en ISO 8601"),
  distance_km: z.number().describe("Kilómetros recorridos"),
  energy_kwh: z.number().nullable().describe("Energía consumida en kWh"),
  start_soc: z.number().nullable().describe("Porcentaje de batería al inicio"),
  end_soc: z.number().nullable().describe("Porcentaje de batería al final"),
  label: z.string().nullable().describe("Nombre del trayecto, p. ej. Casa → Trabajo"),
  note: z.string().nullable().describe("Nota libre"),
});

const maintenanceSchema = z.object({
  occurred_at: z.string().describe("Fecha del servicio en ISO 8601"),
  title: z.string().describe("Qué se ha hecho"),
  category: z
    .string()
    .nullable()
    .describe("tyres, brakes, cabin_filter, coolant, inspection, software u other"),
  cost_eur: z.number().nullable().describe("Coste en euros"),
  mileage_km: z.number().nullable().describe("Kilometraje en el momento del servicio"),
  provider: z.string().nullable().describe("Taller o proveedor"),
  next_due_at: z.string().nullable().describe("Próxima fecha prevista en ISO 8601"),
  next_due_km: z.number().nullable().describe("Próximo kilometraje previsto"),
});

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        const messages = body.messages;
        if (!Array.isArray(messages)) {
          return Response.json({ error: "Falta la conversación" }, { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        const supabaseUrl =
          process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
        const supabaseKey =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ??
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        const token = request.headers
          .get("authorization")
          ?.replace(/^Bearer\s+/i, "");

        if (!key || !supabaseUrl || !supabaseKey) {
          return Response.json(
            { error: "El servicio de IA no está configurado" },
            { status: 500 },
          );
        }
        if (!token) {
          return Response.json(
            { error: "Inicia sesión para hablar con el asistente" },
            { status: 401 },
          );
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          return Response.json({ error: "Sesión no válida" }, { status: 401 });
        }
        const userId = userData.user.id;

        async function vehicleId(): Promise<string | null> {
          const { data } = await supabase
            .from("vehicles")
            .select("id")
            .order("created_at")
            .limit(1)
            .maybeSingle();
          return data?.id ?? null;
        }

        const noVehicle = {
          error: "La persona todavía no ha registrado ningún vehículo en Ajustes.",
        };

        const tools = {
          get_overview: tool({
            description:
              "Resumen general: número de cargas, energía total, coste total, coste medio por kWh, consumo medio y coste por kilómetro.",
            inputSchema: z.object({}),
            execute: async () => {
              const [{ data: charges }, { data: trips }] = await Promise.all([
                supabase.from("charging_sessions").select("energy_kwh, cost_eur"),
                supabase.from("trips").select("distance_km, energy_kwh"),
              ]);

              const chargeRows = charges ?? [];
              const tripRows = trips ?? [];
              const energy = chargeRows.reduce((sum, row) => sum + (row.energy_kwh ?? 0), 0);
              const cost = chargeRows.reduce((sum, row) => sum + (row.cost_eur ?? 0), 0);
              const distance = tripRows.reduce((sum, row) => sum + (row.distance_km ?? 0), 0);
              const tripEnergy = tripRows.reduce((sum, row) => sum + (row.energy_kwh ?? 0), 0);

              return {
                charges: chargeRows.length,
                trips: tripRows.length,
                total_energy_kwh: round(energy),
                total_cost_eur: round(cost),
                total_distance_km: round(distance),
                avg_price_per_kwh: energy > 0 ? round(cost / energy, 3) : null,
                avg_consumption_wh_km:
                  distance > 0 && tripEnergy > 0 ? round((tripEnergy / distance) * 1000, 1) : null,
                cost_per_km_eur: distance > 0 ? round(cost / distance, 3) : null,
              };
            },
          }),

          list_charges: tool({
            description: "Devuelve las cargas más recientes registradas.",
            inputSchema: limitSchema,
            execute: async ({ limit }) => {
              let query = supabase
                .from("charging_sessions")
                .select("*")
                .order("occurred_at", { ascending: false });
              if (limit && limit > 0) query = query.limit(Math.min(limit, 50));
              const { data, error } = await query;
              if (error) return { error: error.message };
              return { charges: data ?? [] };
            },
          }),

          list_trips: tool({
            description: "Devuelve los desplazamientos más recientes registrados.",
            inputSchema: limitSchema,
            execute: async ({ limit }) => {
              let query = supabase
                .from("trips")
                .select("*")
                .order("occurred_at", { ascending: false });
              if (limit && limit > 0) query = query.limit(Math.min(limit, 50));
              const { data, error } = await query;
              if (error) return { error: error.message };
              return { trips: data ?? [] };
            },
          }),

          list_maintenance: tool({
            description:
              "Devuelve el historial de mantenimiento y los servicios con fecha próxima.",
            inputSchema: limitSchema,
            execute: async ({ limit }) => {
              let query = supabase
                .from("maintenance_records")
                .select("*")
                .order("occurred_at", { ascending: false });
              if (limit && limit > 0) query = query.limit(Math.min(limit, 50));
              const { data, error } = await query;
              if (error) return { error: error.message };
              return { maintenance: data ?? [] };
            },
          }),

          log_charge: tool({
            description: "Guarda una sesión de carga en el historial.",
            inputSchema: chargeSchema,
            execute: async (charge) => {
              const id = await vehicleId();
              if (!id) return noVehicle;
              const { data, error } = await supabase
                .from("charging_sessions")
                .insert({ ...charge, user_id: userId, vehicle_id: id, source: "assistant" })
                .select("*")
                .limit(1);
              if (error) return { error: error.message };
              return { saved: (data ?? [])[0] ?? null };
            },
          }),

          log_trip: tool({
            description: "Guarda un desplazamiento en el historial.",
            inputSchema: tripSchema,
            execute: async (trip) => {
              const id = await vehicleId();
              if (!id) return noVehicle;
              const { data, error } = await supabase
                .from("trips")
                .insert({ ...trip, user_id: userId, vehicle_id: id })
                .select("*")
                .limit(1);
              if (error) return { error: error.message };
              return { saved: (data ?? [])[0] ?? null };
            },
          }),

          log_maintenance: tool({
            description: "Guarda una intervención de mantenimiento en el historial.",
            inputSchema: maintenanceSchema,
            execute: async (record) => {
              const id = await vehicleId();
              if (!id) return noVehicle;
              const { data, error } = await supabase
                .from("maintenance_records")
                .insert({ ...record, user_id: userId, vehicle_id: id })
                .select("*")
                .limit(1);
              if (error) return { error: error.message };
              return { saved: (data ?? [])[0] ?? null };
            },
          }),
        };

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const originalMessages = messages as UIMessage[];

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(originalMessages),
          tools,
          stopWhen: stepCountIs(50),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages,
            sendReasoning: true,
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
            onEnd: async ({ messages: allMessages }) => {
              const seen = new Set(originalMessages.map((message) => message.id));
              const rows = allMessages
                .filter((message) => !seen.has(message.id))
                .map((message) => ({
                  user_id: userId,
                  message_id: message.id,
                  role: message.role,
                  content: message,
                }));
              if (!rows.length) return;
              const { error } = await supabase.from("chat_messages").insert(rows);
              if (error) {
                console.error("No se pudo guardar el historial del chat:", error.message);
              }
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
