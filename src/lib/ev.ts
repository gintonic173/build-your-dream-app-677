/**
 * Shared domain types, labels and derived metrics for Voltio.
 * Pure and browser-safe — no Supabase imports here.
 */

export type Vehicle = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  battery_kwh: number | null;
  efficiency_wh_km: number | null;
  starting_range_km: number | null;
  created_at: string;
};

export type ChargingSession = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  started_at: string;
  ended_at: string | null;
  energy_kwh: number;
  cost_eur: number | null;
  price_per_kwh: number | null;
  location: string | null;
  charge_type: string | null;
  soc_start: number | null;
  soc_end: number | null;
  notes: string | null;
  created_at: string;
};

export type Trip = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  started_at: string;
  distance_km: number;
  energy_kwh: number | null;
  soc_start: number | null;
  soc_end: number | null;
  route_type: string | null;
  weather: string | null;
  notes: string | null;
  created_at: string;
};

export type MaintenanceRecord = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  performed_at: string;
  category: string;
  title: string;
  description: string | null;
  cost_eur: number | null;
  odometer_km: number | null;
  due_at: string | null;
  due_km: number | null;
  provider: string | null;
  created_at: string;
};

export type InsightKind = "anomaly" | "trend" | "forecast" | "tip";
export type InsightSeverity = "info" | "watch" | "alert";

export type Insight = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  body: string;
  metric: Record<string, unknown> | null;
  created_at: string;
  dismissed_at: string | null;
};

/* ---------------------------------- labels --------------------------------- */

export const CHARGE_TYPES = [
  { value: "home", label: "Casa" },
  { value: "work", label: "Trabajo" },
  { value: "ac", label: "AC público" },
  { value: "dc", label: "DC rápido" },
  { value: "ultra", label: "Ultra rápido" },
];

export const ROUTE_TYPES = [
  { value: "city", label: "Ciudad" },
  { value: "mixed", label: "Mixto" },
  { value: "highway", label: "Autopista" },
];

export const MAINTENANCE_CATEGORIES = [
  { value: "tyres", label: "Neumáticos" },
  { value: "brakes", label: "Frenos" },
  { value: "cabin_filter", label: "Filtro habitáculo" },
  { value: "coolant", label: "Refrigerante" },
  { value: "inspection", label: "Revisión" },
  { value: "software", label: "Software" },
  { value: "other", label: "Otro" },
];

export const KIND_LABELS: Record<InsightKind, string> = {
  anomaly: "Anomalía",
  trend: "Tendencia",
  forecast: "Previsión",
  tip: "Consejo",
};

export const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  info: "Info",
  watch: "Vigilar",
  alert: "Revisar",
};

export function labelFor(
  options: { value: string; label: string }[],
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

/* -------------------------------- formatting ------------------------------- */

const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export const formatEuro = (value: number | null | undefined) =>
  value == null || Number.isNaN(value) ? "—" : euro.format(value);

export const formatNumber = (
  value: number | null | undefined,
  digits = 1,
) =>
  value == null || Number.isNaN(value)
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0,
      }).format(value);

export const formatKwh = (value: number | null | undefined, digits = 1) =>
  value == null || Number.isNaN(value) ? "—" : `${formatNumber(value, digits)} kWh`;

export const formatKm = (value: number | null | undefined, digits = 0) =>
  value == null || Number.isNaN(value) ? "—" : `${formatNumber(value, digits)} km`;

export const formatPercent = (value: number | null | undefined) =>
  value == null || Number.isNaN(value) ? "—" : `${Math.round(value)} %`;

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatRelative = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "mañana";
  if (diffDays === -1) return "ayer";
  if (diffDays > 1 && diffDays < 31) return `en ${diffDays} días`;
  if (diffDays < -1 && diffDays > -31) return `hace ${Math.abs(diffDays)} días`;
  return formatDate(value);
};

/** `2026-05-04T18:30` — the value shape a datetime-local input expects. */
export function toLocalInput(value: Date = new Date()): string {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function toDateInput(value: Date = new Date()): string {
  return toLocalInput(value).slice(0, 10);
}

/* --------------------------------- metrics --------------------------------- */

export type Overview = {
  charges: number;
  trips: number;
  totalEnergy: number;
  totalCost: number;
  totalDistance: number;
  avgPrice: number | null;
  avgConsumption: number | null;
  costPerKm: number | null;
  monthEnergy: number;
  monthCost: number;
  lastCharge: ChargingSession | null;
  energySeries: { label: string; energy: number; cost: number }[];
  consumptionSeries: { label: string; consumption: number | null }[];
  typeBreakdown: { type: string; energy: number; count: number }[];
};

const monthKey = (value: string) => value.slice(0, 7);
const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export function computeOverview(
  charges: ChargingSession[],
  trips: Trip[],
): Overview {
  const totalEnergy = charges.reduce((sum, charge) => sum + (charge.energy_kwh ?? 0), 0);
  const totalCost = charges.reduce((sum, charge) => sum + (charge.cost_eur ?? 0), 0);
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance_km ?? 0), 0);

  const paidCharges = charges.filter(
    (charge) => (charge.cost_eur ?? 0) > 0 && (charge.energy_kwh ?? 0) > 0,
  );
  const avgPrice = paidCharges.length
    ? paidCharges.reduce((sum, charge) => sum + (charge.cost_eur ?? 0), 0) /
      paidCharges.reduce((sum, charge) => sum + (charge.energy_kwh ?? 0), 0)
    : null;

  const tripEnergy = trips.reduce((sum, trip) => sum + (trip.energy_kwh ?? 0), 0);
  const avgConsumption = totalDistance > 0 && tripEnergy > 0 ? (tripEnergy / totalDistance) * 1000 : null;
  const costPerKm = totalDistance > 0 && totalCost > 0 ? totalCost / totalDistance : null;

  const thisMonth = currentMonthKey();
  const monthCharges = charges.filter((charge) => monthKey(charge.started_at) === thisMonth);
  const monthEnergy = monthCharges.reduce((sum, charge) => sum + (charge.energy_kwh ?? 0), 0);
  const monthCost = monthCharges.reduce((sum, charge) => sum + (charge.cost_eur ?? 0), 0);

  // Last 8 weeks of energy + cost, newest last.
  const weeks: { label: string; start: number; end: number }[] = [];
  const now = new Date();
  for (let index = 7; index >= 0; index -= 1) {
    const end = new Date(now);
    end.setDate(now.getDate() - index * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    weeks.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      start: start.getTime(),
      end: end.getTime(),
    });
  }

  const energySeries = weeks.map((week) => {
    const inWeek = charges.filter((charge) => {
      const time = new Date(charge.started_at).getTime();
      return time >= week.start && time <= week.end;
    });
    return {
      label: week.label,
      energy: Number(
        inWeek.reduce((sum, charge) => sum + (charge.energy_kwh ?? 0), 0).toFixed(1),
      ),
      cost: Number(
        inWeek.reduce((sum, charge) => sum + (charge.cost_eur ?? 0), 0).toFixed(2),
      ),
    };
  });

  const consumptionSeries = weeks.map((week) => {
    const inWeek = trips.filter((trip) => {
      const time = new Date(trip.started_at).getTime();
      return time >= week.start && time <= week.end;
    });
    const distance = inWeek.reduce((sum, trip) => sum + (trip.distance_km ?? 0), 0);
    const energy = inWeek.reduce((sum, trip) => sum + (trip.energy_kwh ?? 0), 0);
    return {
      label: week.label,
      consumption: distance > 0 && energy > 0 ? Math.round((energy / distance) * 1000) : null,
    };
  });

  const types = new Map<string, { energy: number; count: number }>();
  for (const charge of charges) {
    const type = charge.charge_type ?? "home";
    const entry = types.get(type) ?? { energy: 0, count: 0 };
    entry.energy += charge.energy_kwh ?? 0;
    entry.count += 1;
    types.set(type, entry);
  }
  const typeBreakdown = [...types.entries()]
    .map(([type, entry]) => ({ type, energy: Number(entry.energy.toFixed(1)), count: entry.count }))
    .sort((a, b) => b.energy - a.energy);

  const lastCharge = [...charges]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .at(0) ?? null;

  return {
    charges: charges.length,
    trips: trips.length,
    totalEnergy,
    totalCost,
    totalDistance,
    avgPrice,
    avgConsumption,
    costPerKm,
    monthEnergy,
    monthCost,
    lastCharge,
    energySeries,
    consumptionSeries,
    typeBreakdown,
  };
}

/** Battery state of health estimate from recent charge curves (rough proxy). */
export function estimateSoH(charges: ChargingSession[]): number | null {
  const usable = charges.filter(
    (charge) =>
      charge.soc_start != null &&
      charge.soc_end != null &&
      charge.soc_end > charge.soc_start &&
      (charge.energy_kwh ?? 0) > 0,
  );
  if (usable.length < 3) return null;

  const implied = usable.map(
    (charge) => (charge.energy_kwh / (charge.soc_end! - charge.soc_start!)) * 100,
  );
  const best = Math.max(...implied);
  if (!Number.isFinite(best) || best <= 0) return null;

  const newest = [...usable]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .at(0)!;
  const latest = (newest.energy_kwh / (newest.soc_end! - newest.soc_start!)) * 100;
  const ratio = (latest / best) * 100;
  return Math.min(100, Math.max(70, Math.round(ratio)));
}
