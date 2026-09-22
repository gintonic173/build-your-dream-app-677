import { useState, type FormEvent } from "react";
import { Navigate, createFileRoute, navigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/session";
import { VoltioMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export const Route = createFileRoute("/acceder")({
  head: () => ({
    meta: [
      { title: "Entrar · Voltio" },
      {
        name: "description",
        content: "Accede a tu registro de cargas, rutas y mantenimiento del coche eléctrico.",
      },
      { property: "og:title", content: "Entrar · Voltio" },
      {
        property: "og:description",
        content: "Tu registro de coche eléctrico, guardado en la nube y listo para consultar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessScreen,
});

function AccessScreen() {
  const { signedIn, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  if (!loading && signedIn) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return toast.error(error.message);
        await navigate({ to: "/" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) return toast.error(error.message);
        if (!data.session) {
          toast.success("Casi listo: confirma tu correo para entrar.");
          return;
        }
        await navigate({ to: "/" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message);
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) return;
      await navigate({ to: "/" });
    } finally {
      if (!document.hidden) setGoogleBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <VoltioMark size={52} />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Voltio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El control completo de tu coche eléctrico.
          </p>
        </div>

        <div className="panel p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
            {(["signin", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  mode === value
                    ? "bg-card font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {value === "signin" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full"
              size="lg"
              variant="default"
            >
              {busy ? "Un momento…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="eyebrow">o</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={googleBusy}
            onClick={handleGoogle}
          >
            <GoogleIcon />
            Continuar con Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tus datos son privados: solo tú ves tu registro.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.8Z"
      />
      <path
        fill="currentColor"
        opacity=".7"
        d="M12 24c3.21 0 5.9-1.06 7.87-2.88l-3.86-3c-1.05.7-2.39 1.12-4.01 1.12-3.08 0-5.68-2.07-6.61-4.86H1.44v3.1A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="currentColor"
        opacity=".4"
        d="M5.39 14.38a7.2 7.2 0 0 1 0-4.62V6.66H1.44a12 12 0 0 0 0 10.8l3.95-3.08Z"
      />
      <path
        fill="currentColor"
        opacity=".55"
        d="M12 4.75c1.75 0 3.32.6 4.56 1.78l3.41-3.41A11.97 11.97 0 0 0 1.44 6.66l3.95 3.1C6.32 6.82 8.92 4.75 12 4.75Z"
      />
    </svg>
  );
}
