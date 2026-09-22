import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Sparkle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VehicleForm } from "@/components/vehicle-form";
import { vehiclesRepo } from "@/lib/db";
import { keys, useCharges, useMaintenance, useTrips, useVehicles } from "@/lib/queries";
import { toDateInput } from "@/lib/ev";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes · Voltio" },
      {
        name: "description",
        content: "Gestiona tu vehículo, carga datos de ejemplo y revisa tu cuenta en Voltio.",
      },
      { property: "og:title", content: "Ajustes · Voltio" },
      {
        property: "og:description",
        content: "Tu vehículo, tus datos y tu cuenta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const vehicles = useVehicles();
  const vehicle = vehicles.data?.[0];
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"demo" | "clear" | "vehicle" | null>(null);

  const hasData =
    (useCharges().data?.length ?? 0) +
      (useTrips().data?.length ?? 0) +
      (useMaintenance().data?.length ?? 0) >
    0;

  async function loadDemoData() {
    if (!vehicle) return;
    setBusy("demo");
    try {
      const today = new Date();
      const charges = Array.from({ length: 10 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - index * 3 - 1);
        date.setHours(19 + (index % 3), 0, 0, 0);
        const energy = [42, 28, 55, 33, 47, 21, 60, 38, 26, 51][index] ?? 40;
        const home = index % 3 !== 2;
        const price = home ? 0.145 : 0.55;
        return {
          user_id: vehicle.user_id,
          vehicle_id: vehicle.id,
          occurred_at: date.toISOString(),
          energy_kwh: energy,
          cost_eur: Math.round(energy * price * 100) / 100,
          price_per_kwh: price,
          charger_type: home ? "home" : "dc",
          start_soc: 18 + (index % 4) * 5,
          end_soc: home ? 100 : 80,
          location_label: home ? "Casa" : "Punto de carga rápido",
          source: "demo",
          note: "dato de ejemplo",
        };
      });

      const trips = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - index * 4 - 2);
        date.setHours(8, 30, 0, 0);
        const distance = [38, 12, 145, 27, 9, 88][index] ?? 30;
        const whKm = [152, 168, 212, 158, 145, 198][index] ?? 170;
        return {
          user_id: vehicle.user_id,
          vehicle_id: vehicle.id,
          occurred_at: date.toISOString(),
          distance_km: distance,
          energy_kwh: Math.round((distance * whKm) / 1000 * 10) / 10,
          start_soc: 90 - index * 3,
          end_soc: Math.max(12, 90 - Math.round((distance * whKm) / 774)),
          label: distance > 100 ? "Viaje largo" : "Día a día",
          note: "dato de ejemplo",
        };
      });

      const [a, b] = await Promise.all([
        supabase.from("charging_sessions").insert(charges),
        supabase.from("trips").insert(trips),
      ]);
      if (a.error) throw new Error(a.error.message);
      if (b.error) throw new Error(b.error.message);

      queryClient.invalidateQueries();
      toast.success("Datos de ejemplo cargados. Puedes borrarlos cuando quieras.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se han podido cargar");
    } finally {
      setBusy(null);
    }
  }

  async function clearDemoData() {
    setBusy("clear");
    try {
      const [a, b] = await Promise.all([
        supabase.from("charging_sessions").delete().eq("source", "demo"),
        supabase.from("trips").delete().eq("note", "dato de ejemplo"),
      ]);
      if (a.error) throw new Error(a.error.message);
      if (b.error) throw new Error(b.error.message);
      queryClient.invalidateQueries();
      toast.success("Datos de ejemplo eliminados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se han podido borrar");
    } finally {
      setBusy(null);
    }
  }

  async function removeVehicle() {
    if (!vehicle) return;
    setBusy("vehicle");
    try {
      await vehiclesRepo.remove(vehicle.id);
      queryClient.invalidateQueries({ queryKey: keys.vehicles });
      toast.success("Vehículo eliminado");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? "Primero borra los registros asociados a este vehículo."
          : "No se ha podido eliminar",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu vehículo, tus datos y tu cuenta.
        </p>
      </header>

      <section className="panel p-5">
        <h2 className="font-display text-base font-semibold">Vehículo</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Los datos que uses aquí sirven para estimar autonomía y consumos.
        </p>
        <Separator className="my-4" />
        {vehicle ? (
          <div className="space-y-5">
            <VehicleForm vehicle={vehicle} />
            <div className="flex items-center justify-between gap-4 hairline-top pt-4">
              <p className="text-xs text-muted-foreground">
                Elimina el vehículo si ya no lo usas en Voltio.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive"
                disabled={busy === "vehicle"}
                onClick={removeVehicle}
              >
                <Trash2 className="size-4" />
                Eliminar vehículo
              </Button>
            </div>
          </div>
        ) : (
          <VehicleForm />
        )}
      </section>

      <section className="panel p-5">
        <h2 className="font-display text-base font-semibold">Datos de ejemplo</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Carga un historial ficticio para probar el resumen y el asistente. Se marca como
          «dato de ejemplo» y puedes borrarlo con un clic.
        </p>
        <Separator className="my-4" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!vehicle || busy === "demo"}
            onClick={loadDemoData}
          >
            <Sparkle className="size-4" />
            {busy === "demo" ? "Cargando…" : "Cargar datos de ejemplo"}
          </Button>
          {hasData && (
            <Button
              variant="outline"
              disabled={busy === "clear"}
              onClick={clearDemoData}
            >
              {busy === "clear" ? "Borrando…" : "Borrar datos de ejemplo"}
            </Button>
          )}
        </div>
        {!vehicle && (
          <p className="mt-3 text-xs text-muted-foreground">
            Guarda primero un vehículo para poder cargar el ejemplo.
          </p>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="font-display text-base font-semibold">Cuenta</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tu registro es privado: solo tú ves tus datos.
        </p>
        <Separator className="my-4" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Correo</p>
            <p className="mt-1 text-sm">{supabase ? "" : ""}</p>
            <AccountEmail />
          </div>
          <Button variant="outline" className="gap-2" onClick={() => supabase.auth.signOut()}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Voltio · tus datos, tu coche.
      </p>
    </div>
  );
}

function AccountEmail() {
  const [email, setEmail] = useState<string | null>(null);

  if (email === null) {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? "—");
    });
    return <p className="mt-1 text-sm text-muted-foreground">…</p>;
  }

  return <p className="mt-1 text-sm">{email}</p>;
}

export { toDateInput };
