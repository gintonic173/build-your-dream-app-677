import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BatteryCharging,
  CircleAlert,
  Lightbulb,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VehicleForm } from "@/components/vehicle-form";
import { VoltioMark } from "@/components/brand";
import {
  keys,
  useInsights,
  useInsightActions,
  useCharges,
  useTrips,
  useVehicles,
} from "@/lib/queries";
import { runHealthCheck } from "@/lib/insights.functions";
import {
  KIND_LABELS,
  SEVERITY_LABELS,
  computeOverview,
  estimateSoH,
  formatEuro,
  formatKm,
  formatKwh,
  formatNumber,
  formatRelative,
} from "@/lib/ev";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Resumen · Voltio" },
      {
        name: "description",
        content:
          "Energía cargada, coste por kilómetro, consumo medio y salud de la batería de tu coche eléctrico.",
      },
      { property: "og:title", content: "Resumen · Voltio" },
      {
        property: "og:description",
        content: "Tus cifras de conducción eléctrica, actualizadas al día.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const vehicles = useVehicles();
  const charges = useCharges();
  const trips = useTrips();

  const vehicle = vehicles.data?.[0];

  if (vehicles.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <VoltioMark size={36} className="animate-breathe" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="mb-6 text-center">
          <VoltioMark size={48} className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Empecemos por tu coche
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dile cómo se llama y sus datos básicos. Después podrás registrar cargas y rutas.
          </p>
        </div>
        <div className="panel p-6">
          <VehicleForm />
        </div>
      </div>
    );
  }

  const overview = computeOverview(charges.data ?? [], trips.data ?? []);
  const soh = estimateSoH(charges.data ?? []);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{vehicle.name}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Resumen</h1>
        </div>
        <HealthCheckButton />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Energía cargada"
          value={formatKwh(overview.totalEnergy, 0)}
          hint={`${overview.charges} cargas`}
          tone="energy"
        />
        <Stat
          label="Gasto total"
          value={formatEuro(overview.totalCost)}
          hint={overview.avgPrice ? `${formatEuro(overview.avgPrice)} / kWh` : "sin precios"}
          tone="cost"
        />
        <Stat
          label="Coste por kilómetro"
          value={overview.costPerKm ? `${formatNumber(overview.costPerKm * 100, 1)} c` : "—"}
          hint={formatKm(overview.totalDistance, 0)}
          tone="range"
        />
        <Stat
          label="Consumo medio"
          value={overview.avgConsumption ? `${formatNumber(overview.avgConsumption, 0)} Wh/km` : "—"}
          hint={soh ? `Batería ≈ ${soh} %` : "faltan cargas con %"}
          tone="health"
        />
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold">Últimas 8 semanas</h2>
            <p className="text-xs text-muted-foreground">Energía cargada y coste por semana</p>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <TrendingUp className="size-3" />
            {formatKwh(overview.monthEnergy, 0)} este mes
          </Badge>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.energySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                cursor={{ fill: "var(--hairline)" }}
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--color-muted-foreground)" }}
                formatter={(value: number, name: string) =>
                  name === "energy"
                    ? [`${value} kWh`, "Energía"]
                    : [`${value} €`, "Coste"]
                }
              />
              <Bar dataKey="energy" fill="var(--color-energy)" radius={[4, 4, 0, 0]} maxBarSize={34} />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="var(--color-cost)"
                strokeWidth={2}
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <InsightPanel />
        <RecentPanel
          charges={charges.data ?? []}
          trips={trips.data ?? []}
          lastCharge={overview.lastCharge}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "energy" | "cost" | "range" | "health";
}) {
  const toneClass = {
    energy: "text-energy",
    cost: "text-cost",
    range: "text-range",
    health: "text-health",
  }[tone];

  return (
    <div className="panel p-4">
      <p className="eyebrow">{label}</p>
      <p className={cn("readout mt-3 text-2xl font-semibold", toneClass)}>{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function HealthCheckButton() {
  const runHealth = useServerFn(runHealthCheck);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleRun() {
    setBusy(true);
    try {
      const result = await runHealth({});
      await queryClient.invalidateQueries({ queryKey: keys.insights });
      toast[result.created ? "success" : "message"](
        result.message ?? "Análisis completado",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "El análisis no ha funcionado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleRun} disabled={busy} className="gap-2">
      <RefreshCw className={cn("size-4", busy && "animate-spin")} />
      {busy ? "Analizando…" : "Análisis de salud"}
    </Button>
  );
}

function InsightPanel() {
  const insights = useInsights();
  const actions = useInsightActions();

  return (
    <section className="panel flex min-h-[16rem] flex-col p-5">
      <h2 className="font-display text-base font-semibold">Qué te dice Voltio</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Hallazgos del último análisis de tus datos
      </p>

      <div className="mt-4 flex-1 space-y-2">
        {insights.isLoading && (
          <div className="scan-line h-20 rounded-lg bg-muted/40" />
        )}

        {!insights.isLoading && (insights.data?.length ?? 0) === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Lightbulb className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ejecuta el análisis de salud para ver anomalías, tendencias y avisos.
            </p>
          </div>
        )}

        {(insights.data ?? []).slice(0, 5).map((insight) => {
          const Icon = insight.kind === "anomaly" ? CircleAlert : TrendingUp;
          const alert = insight.severity === "alert";
          return (
            <article
              key={insight.id}
              className={cn(
                "panel-tight p-3.5",
                alert && "border-alert/40 bg-alert/5",
              )}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    alert ? "text-alert" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <Badge variant="secondary" className="text-[0.625rem]">
                      {KIND_LABELS[insight.kind] ?? insight.kind}
                    </Badge>
                    <span className="eyebrow">{SEVERITY_LABELS[insight.severity] ?? insight.severity}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => actions.remove.mutate(insight.id)}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ocultar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RecentPanel({
  charges,
  trips,
  lastCharge,
}: {
  charges: import("@/lib/ev").ChargingSession[];
  trips: import("@/lib/ev").Trip[];
  lastCharge: import("@/lib/ev").ChargingSession | null;
}) {
  const recentCharges = [...charges]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 4);
  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 3);

  return (
    <section className="panel flex min-h-[16rem] flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Actividad reciente</h2>
        <Link
          to="/cargas"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver cargas <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="mt-4 flex-1 space-y-2">
        {recentCharges.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <BatteryCharging className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no hay cargas. Registra la primera y el resto se ordenará solo.
            </p>
          </div>
        )}

        {recentCharges.map((charge) => (
          <div key={charge.id} className="panel-tight flex items-center gap-3 px-3.5 py-2.5">
            <BatteryCharging className="size-4 shrink-0 text-energy" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {charge.location_label ?? "Carga"} · {formatKwh(charge.energy_kwh)}
              </p>
              <p className="text-xs text-muted-foreground">{formatRelative(charge.occurred_at)}</p>
            </div>
            <p className="readout text-sm text-cost">{formatEuro(charge.cost_eur)}</p>
          </div>
        ))}

        {recentTrips.length > 0 && (
          <div className="hairline-top pt-3">
            <p className="eyebrow mb-2">Desplazamientos</p>
            {recentTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="truncate text-muted-foreground">
                  {trip.label ?? "Trayecto"} · {formatKm(trip.distance_km)}
                </span>
                <span className="readout text-xs text-muted-foreground">
                  {formatRelative(trip.occurred_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {lastCharge && (
        <p className="hairline-top mt-3 pt-3 text-xs text-muted-foreground">
          Última carga: {formatRelative(lastCharge.occurred_at)}
        </p>
      )}
    </section>
  );
}
