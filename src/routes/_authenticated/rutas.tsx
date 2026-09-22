import { createFileRoute } from "@tanstack/react-router";
import { RecordManager, type Field } from "@/components/record-manager";
import { NeedVehicle } from "@/components/need-vehicle";
import { tripsRepo } from "@/lib/db";
import {
  keys,
  useActiveVehicle,
  useRecordWriter,
  useTrips,
} from "@/lib/queries";
import { formatKm, formatKwh, formatNumber, type Trip } from "@/lib/ev";

export const Route = createFileRoute("/_authenticated/rutas")({
  head: () => ({
    meta: [
      { title: "Rutas · Voltio" },
      {
        name: "description",
        content: "Desplazamientos de tu coche eléctrico con distancia, consumo y autonomía usada.",
      },
      { property: "og:title", content: "Rutas · Voltio" },
      {
        property: "og:description",
        content: "Cada trayecto con su distancia y consumo real en Wh/km.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TripsPage,
});

const FIELDS: Field[] = [
  { name: "occurred_at", label: "Fecha y hora", type: "datetime", required: true },
  { name: "label", label: "Nombre del trayecto", type: "text", placeholder: "Casa → Trabajo" },
  { name: "distance_km", label: "Distancia (km)", type: "number", required: true, half: true },
  { name: "energy_kwh", label: "Energía (kWh)", type: "number", half: true },
  { name: "start_soc", label: "Batería inicial (%)", type: "number", half: true },
  { name: "end_soc", label: "Batería final (%)", type: "number", half: true },
  { name: "avg_speed_kmh", label: "Velocidad media (km/h)", type: "number", half: true },
  { name: "note", label: "Nota", type: "textarea" },
];

function consumption(trip: Trip): number | null {
  if (trip.energy_kwh && trip.distance_km) return (trip.energy_kwh / trip.distance_km) * 1000;
  if (trip.start_soc != null && trip.end_soc != null && trip.distance_km) {
    const delta = trip.start_soc - trip.end_soc;
    if (delta > 0) return (delta / 100) * 77.4 * 1000 / trip.distance_km;
  }
  return null;
}

function TripsPage() {
  const vehicle = useActiveVehicle();
  const trips = useTrips();
  const writer = useRecordWriter(
    keys.trips,
    tripsRepo,
    vehicle ? { vehicle_id: vehicle.id } : undefined,
  );

  if (!vehicle) return <NeedVehicle />;

  return (
    <RecordManager<Trip>
      singular="Ruta"
      description="Cada desplazamiento con su distancia y consumo real."
      fields={FIELDS}
      writer={writer}
      rows={trips.data ?? []}
      loading={trips.isLoading}
      matches={(row, term) =>
        [row.label, row.note].filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
      }
      title={(row) => row.label ?? "Desplazamiento"}
      subtitle={(row) =>
        row.start_soc != null && row.end_soc != null
          ? `${row.start_soc} % → ${row.end_soc} %`
          : formatKm(row.distance_km)
      }
      columns={[
        { label: "Distancia", render: (row) => formatKm(row.distance_km), emphasize: true },
        { label: "Energía", render: (row) => formatKwh(row.energy_kwh) },
        {
          label: "Wh/km",
          render: (row) => {
            const value = consumption(row);
            return value ? formatNumber(value, 0) : "—";
          },
        },
      ]}
    />
  );
}
