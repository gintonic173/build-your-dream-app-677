import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useRouter } from "@tanstack/react-router";
import {
  BatteryCharging,
  Bot,
  Gauge,
  LogOut,
  Road,
  Settings,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { VoltioMark } from "@/components/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/", label: "Resumen", icon: Gauge },
  { to: "/cargas", label: "Cargas", icon: BatteryCharging },
  { to: "/rutas", label: "Rutas", icon: Road },
  { to: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
  { to: "/asistente", label: "Asistente", icon: Bot },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { signedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !signedIn) {
      router.navigate({ to: "/acceder", replace: true });
    }
  }, [loading, signedIn, router]);

  if (loading || !signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <VoltioMark size={40} className="animate-breathe" />
      </div>
    );
  }

  return <AppShell />;
}

function AppShell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-hairline bg-surface/60 p-5 backdrop-blur-xl md:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <VoltioMark size={28} />
          <span className="font-display text-lg font-semibold tracking-tight">Voltio</span>
        </Link>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-hairline bg-surface/95 px-2 py-1.5 backdrop-blur-xl md:hidden">
        {NAV.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

type NavItemProps = { to: string; label: string; icon: typeof Gauge };

function NavItem({ to, label, icon: Icon }: NavItemProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
      activeProps={{ className: "active" }}
      activeOptions={{ exact: to === "/" }}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function MobileNavItem({ to, label, icon: Icon }: NavItemProps) {
  return (
    <Link
      to={to}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[0.625rem] text-muted-foreground transition-colors [&.active]:text-energy"
      activeProps={{ className: "active" }}
      activeOptions={{ exact: to === "/" }}
    >
      <Icon className="size-5" />
      <span className="truncate">{label.split(" ")[0]}</span>
    </Link>
  );
}

export { cn };
