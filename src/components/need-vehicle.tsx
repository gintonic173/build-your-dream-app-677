import { Link } from "@tanstack/react-router";
import { CarFront } from "lucide-react";

/** Shown on any page that records data before a vehicle exists. */
export function NeedVehicle() {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <CarFront className="size-8 text-energy" />
      <p className="font-medium">Primero falta tu coche</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Añade tu vehículo en el resumen. Todo lo que registres aquí se guardará junto a él.
      </p>
      <Link
        to="/"
        className="mt-1 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ir al resumen
      </Link>
    </div>
  );
}
