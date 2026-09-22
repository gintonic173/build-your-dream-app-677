import { createFileRoute } from "@tanstack/react-router";
import { RecordManager, type Field } from "@/components/record-manager";
import { NeedVehicle } from "@/components/need-vehicle";
import { chargesRepo } from "@/lib/db";
import {
  keys,
  useActiveVehicle,
  useCharges,
  useRecordWriter,
} from "@/lib/queries";
import {
  CHARGER_TYPES,
  formatEuro,
  formatKwh,
  formatNumber,
  labelFor,
  type ChargingSession,
} from "@/lib/ev";

export const Route = createFileRoute("/_authenticated/cargas")({
  head: () => ({
    meta: [
      { title: "Cargas · Voltio" },
      {
        name: "description",
        content: "Historial de cargas de tu coche eléctrico con energía, precio y lugar.",
      },
      { property: "og:title", content: "Cargas · Voltio" },
      {
        property: "og:description",
        content: "Cada carga con su energía, coste y porcentaje de batería.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChargesPage,
});

const FIELDS: Field[] = [
  { name: "occurred_at", label: "Fecha y hora", type: "datetime", required: true },
  { name: "energy_kwh", label: "Energía (kWh)", type: "number", required: true, half: true },
  { name: "cost_eur", label: "Coste (€)", type: "number", half: true },
  {
    name: "price_per_kwh",
    label: "Precio por kWh (€)",
    type: "number",
    half: true,
    hint: "Si lo dejas vacío, se calcula con coste y energía.",
  },
  {
    name: "charger_type",
    label: "Tipo de carga",
    type: "select",
    options: CHARGER_TYPES,
    defaultValue: "home",
    half: true,
  },
  { name: "start_soc", label: "Batería inicial (%)", type: "number", half: true },
  { name: "end_soc", label: "Batería final (%)", type: "number", half: true },
  { name: "location_label", label: "Lugar", type: "text", placeholder: "Casa, Iberdrola A-3…" },
  { name: "mileage_km", label: "Kilometraje", type: "number", half: true },
  { name: "note", label: "Nota", type: "textarea" },
];

function ChargesPage() {
  const vehicle = useActiveVehicle();
  const charges = useCharges();
  const writer = useRecordWriter(
    keys.charges,
    chargesRepo,
    vehicle ? { vehicle_id: vehicle.id } : undefined,
  );

  if (!vehicle) return <NeedVehicle />;

  return (
    <RecordManager<ChargingSession>
      singular="Carga"
      description="Cada sesión de carga con su energía, coste y estado de batería."
      fields={FIELDS}
      writer={writer}
      rows={charges.data ?? []}
      loading={charges.isLoading}
      emptyHint="Registra la primera carga con el botón de arriba; el asistente también puede hacerlo por ti."
      matches={(row, term) =>
        [row.location_label, row.note, labelFor(CHARGER_TYPES, row.charger_type)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      }
      title={(row) => row.location_label ?? labelFor(CHARGER_TYPES, row.charger_type)}
      subtitle={(row) =>
        row.start_soc != null && row.end_soc != null
          ? `${row.start_soc} % → ${row.end_soc} %`
          : labelFor(CHARGER_TYPES, row.charger_type)
      }
      columns={[
        { label: "Energía", render: (row) => formatKwh(row.energy_kwh), emphasize: true },
        { label: "Coste", render: (row) => formatEuro(row.cost_eur) },
        {
          label: "€/kWh",
          render: (row) =>
            row.price_per_kwh != null
              ? formatNumber(row.price_per_kwh, 3)
              : row.cost_eur && row.energy_kwh
                ? formatNumber(row.cost_eur / row.energy_kwh, 3)
                : "—",
        },
      ]}
    />
  );
}
