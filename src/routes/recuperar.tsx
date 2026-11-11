import { useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoltioMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña · Voltio" },
      {
        name: "description",
        content: "Recibe un enlace seguro para recuperar el acceso a tu cuenta de Voltio.",
      },
      { property: "og:title", content: "Recuperar contraseña · Voltio" },
      {
        property: "og:description",
        content: "Recupera el acceso a tu registro de coche eléctrico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RecoverPasswordScreen,
});

function RecoverPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(
          error.code === "over_email_send_rate_limit"
            ? "Se han enviado demasiados correos. Espera un poco antes de intentarlo otra vez."
            : "No he podido enviar el correo. Inténtalo de nuevo.",
        );
        return;
      }

      setSent(true);
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
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Te enviaremos un enlace seguro para volver a entrar.
          </p>
        </div>

        <div className="panel p-6">
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-semibold">Revisa tu correo</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Si hay una cuenta asociada a <span className="text-foreground">{email}</span>,
                recibirás un enlace para elegir una contraseña nueva. Mira también el correo no
                deseado.
              </p>
              <Button asChild className="mt-6 w-full" size="lg">
                <Link to="/acceder">Volver a entrar</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recovery-email">Correo de tu cuenta</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full" size="lg">
                {busy ? "Enviando…" : "Enviar enlace de recuperación"}
              </Button>
            </form>
          )}
        </div>

        <Button asChild variant="ghost" className="mt-5 w-full gap-2">
          <Link to="/acceder">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a entrar
          </Link>
        </Button>
      </div>
    </div>
  );
}
