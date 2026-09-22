import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { vehiclesRepo } from "@/lib/db";
import { keys } from "@/lib/queries";
import type { Vehicle } from "@/lib/ev";

const BLANK = {
  name: "",
  make: "",
  model: "",
  model_year: "",
  plate: "",
  battery_kwh: "",
  efficiency_wh_km: "",
  wltp_range_km: "",
};

type Form = typeof BLANK;

function fromVehicle(vehicle?: Vehicle | null): Form {
  if (!vehicle) return { ...BLANK };
  return {
    name: vehicle.name ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    model_year: vehicle.model_year ? String(vehicle.model_year) : "",
    plate: vehicle.plate ?? "",
    battery_kwh: vehicle.battery_kwh != null ? String(vehicle.battery_kwh) : "",
    efficiency_wh_km:
      vehicle.efficiency_wh_km != null ? String(vehicle.efficiency_wh_km) : "",
    wltp_range_km: vehicle.wltp_range_km != null ? String(vehicle.wltp_range_km) : "",
  };
}

export function VehicleForm({
  vehicle,
  onDone,
}: {
  vehicle?: Vehicle | null;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(() => fromVehicle(vehicle));
  const [busy, setBusy] = useState(false);

  const set = (key: keyof Form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const values = {
        name: form.name.trim(),
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        model_year: form.model_year ? Number(form.model_year) : null,
        plate: form.plate.trim() || null,
        battery_kwh: form.battery_kwh ? Number(form.battery_kwh) : null,
        efficiency_wh_km: form.efficiency_wh_km ? Number(form.efficiency_wh_km) : null,
        wltp_range_km: form.wltp_range_km ? Number(form.wltp_range_km) : null,
      };

      if (vehicle) await vehiclesRepo.update(vehicle.id, values);
      else await vehiclesRepo.create(values);

      queryClient.invalidateQueries({ queryKey: keys.vehicles });
      toast.success(vehicle ? "Vehículo actualizado" : "Vehículo añadido");
      onDone?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="v-name">Nombre</Label>
        <Input
          id="v-name"
          required
          placeholder="Mi coche"
          value={form.name}
          onChange={set("name")}
        />
      </div>

      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="v-make">Marca</Label>
        <Input id="v-make" placeholder="Kia" value={form.make} onChange={set("make")} />
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="v-model">Modelo</Label>
        <Input id="v-model" placeholder="EV6" value={form.model} onChange={set("model")} />
      </div>

      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="v-year">Año</Label>
        <Input
          id="v-year"
          type="number"
          min={1990}
          max={2100}
          placeholder="2023"
          value={form.model_year}
          onChange={set("model_year")}
        />
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="v-plate">Matrícula</Label>
        <Input id="v-plate" placeholder="1234 ABC" value={form.plate} onChange={set("plate")} />
      </div>

      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="v-battery">Batería (kWh)</Label>
        <Input
          id="v-battery"
          type="number"
          step="any"
          min={0}
          placeholder="77.4"
          value={form.battery_kwh}
          onChange={set("battery_kwh")}
        />
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="v-range">Autonomía homologada (km)</Label>
        <Input
          id="v-range"
          type="number"
          step="any"
          min={0}
          placeholder="528"
          value={form.wltp_range_km}
          onChange={set("wltp_range_km")}
        />
      </div>

      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="v-eff">Consumo típico (Wh/km)</Label>
        <Input
          id="v-eff"
          type="number"
          step="any"
          min={0}
          placeholder="175"
          value={form.efficiency_wh_km}
          onChange={set("efficiency_wh_km")}
        />
        <p className="text-xs text-muted-foreground">
          Opcional. Sirve para estimar autonomía y consumos cuando no los registras.
        </p>
      </div>

      <div className="col-span-2 flex justify-end gap-2 pt-1">
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar vehículo"}
        </Button>
      </div>
    </form>
  );
}
