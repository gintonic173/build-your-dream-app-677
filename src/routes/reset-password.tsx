import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoltioMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña · Voltio" },
      {
        name: "description",
        content: "Elige una contraseña nueva para tu cuenta de Voltio.",
      },
      { property: "og:title", content: "Nueva contraseña · Voltio" },
      {
        property: "og:description",
        content: "Recupera el acceso a tu registro de coche eléctrico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordScreen,
});

type LinkStatus = "checking" | "ready" | "invalid";

function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LinkStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let recoveryEventSeen = false;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const hasRecoveryHash = hash.get("type") === "recovery";
    const hasRecoveryCode = new URLSearchParams(window.location.search).has("code");
    const cameFromRecoveryLink = hasRecoveryHash || hasRecoveryCode;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        recoveryEventSeen = true;
        setStatus("ready");
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || recoveryEventSeen) return;
      if (!error && cameFromRecoveryLink && data.session) {
        setStatus("ready");
      } else {
        setStatus("invalid");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Las dos contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(
          error.code === "same_password"
            ? "Elige una contraseña distinta de la anterior."
            : "No he podido guardar la contraseña. Pide un enlace nuevo e inténtalo otra vez.",
        );
        return;
      }

      toast.success("Contraseña actualizada. Ya puedes usar Voltio.");
      await navigate({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <VoltioMark size={52} />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Nueva contraseña
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige una contraseña que no uses en otras cuentas.
          </p>
        </div>

        <div className="panel p-6">
          {status === "checking" && (
            <p className="py-6 text-center text-sm text-muted-foreground" role="status">
              Comprobando el enlace…
            </p>
          )}

          {status === "invalid" && (
            <div className="text-center">
              <KeyRound className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-semibold">El enlace no es válido</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Puede que haya caducado o que ya se haya utilizado. Pide otro para continuar.
              </p>
              <Button asChild className="mt-6 w-full" size="lg">
                <Link to="/recuperar">Pedir otro enlace</Link>
              </Button>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Contraseña nueva</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Repite la contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Escríbela otra vez"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full" size="lg">
                {busy ? "Guardando…" : "Guardar contraseña y entrar"}
              </Button>
            </form>
          )}
        </div>

        {status !== "ready" && (
          <Button asChild variant="ghost" className="mt-5 w-full">
            <Link to="/acceder">Volver a entrar</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
