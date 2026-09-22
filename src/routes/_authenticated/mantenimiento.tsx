import { createFileRoute } from "@tanstack/react-router";
import { RecordManager, type Field } from "@/components/record-manager";
import { NeedVehicle } from "@/components/need-vehicle";
import { maintenanceRepo } from "@/lib/db";
import {
  keys,
  useActiveVehicle,
  useMaintenance,
  useRecordWriter,
} from "@/lib/queries";
import {
  MAINTENANCE_CATEGORIES,
  formatEuro,
  formatKm,
  formatDate,
  labelFor,
  type MaintenanceRecord,
} from "@/lib/ev";

export const Route = createFileRoute("/_authenticated/mantenimiento")({
  head: () => ({
    meta: [
      { title: "Mantenimiento · Voltio" },
      {
        name: "description",
        content: "Servicios, revisiones y avisos de mantenimiento de tu coche eléctrico.",
      },
      { property: "og:title", content: "Mantenimiento · Voltio" },
      {
        property: "og:description",
        content: "Historial de servicios y próximas fechas previstas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenancePage,
});

const FIELDS: Field[] = [
  { name: "occurred_at", label: "Fecha", type: "date", required: true },
  { name: "title", label: "Qué se ha hecho", type: "text", required: true, placeholder: "Cambio de neumáticos" },
  {
    name: "category",
    label: "Categoría",
    type: "select",
    options: MAINTENANCE_CATEGORIES,
    half: true,
  },
  { name: "cost_eur", label: "Coste (€)", type: "number", half: true },
  { name: "mileage_km", label: "Kilometraje", type: "number", half: true },
  { name: "provider", label: "Taller o proveedor", type: "text", half: true },
  { name: "next_due_at", label: "Próxima fecha", type: "date", half: true },
  { name: "next_due_km", label: "Próximo kilometraje", type: "number", half: true },
  { name: "description", label: "Detalle", type: "textarea" },
];

function MaintenancePage() {
  const vehicle = useActiveVehicle();
  const maintenance = useMaintenance();
  const writer = useRecordWriter(
    keys.maintenance,
    maintenanceRepo,
    vehicle ? { vehicle_id: vehicle.id } : undefined,
  );

  if (!vehicle) return <NeedVehicle />;

  return (
    <RecordManager<MaintenanceRecord>
      singular="Servicio"
      description="Revisiones, neumáticos y cualquier intervención con su coste."
      fields={FIELDS}
      writer={writer}
      rows={maintenance.data ?? []}
      loading={maintenance.isLoading}
      emptyHint="Anota la última revisión o el cambio de neumáticos; puedes añadir la próxima fecha prevista."
      matches={(row, term) =>
        [row.title, row.description, row.provider, labelFor(MAINTENANCE_CATEGORIES, row.category)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      }
      title={(row) => row.title}
      subtitle={(row) =>
        [labelFor(MAINTENANCE_CATEGORIES, row.category), formatDate(row.occurred_at)]
          .filter(Boolean)
          .join(" · ")
      }
      columns={[
        { label: "Coste", render: (row) => formatEuro(row.cost_eur), emphasize: true },
        { label: "Km", render: (row) => formatKm(row.mileage_km) },
        {
          label: "Próximo",
          render: (row) =>
            row.next_due_at ? formatDate(row.next_due_at) : row.next_due_km ? formatKm(row.next_due_km) : "—",
        },
      ]}
    />
  );
}
