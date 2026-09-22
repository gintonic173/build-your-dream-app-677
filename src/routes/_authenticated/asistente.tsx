import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { BrainIcon, ChevronDownIcon, CircleAlertIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { VoltioMark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool";
import { useAuth } from "@/lib/session";
import { useChatHistory } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/asistente")({
  head: () => ({
    meta: [
      { title: "Asistente · Voltio" },
      {
        name: "description",
        content:
          "Pregunta a Voltio por tu consumo, coste por kilómetro o el próximo mantenimiento, y registra datos chateando.",
      },
      { property: "og:title", content: "Asistente · Voltio" },
      {
        property: "og:description",
        content: "Un chat que conoce tus cargas, rutas y mantenimiento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

const QUICK_PROMPTS = [
  "¿Cuánto me cuesta cada kilómetro?",
  "¿Cómo va mi consumo este mes?",
  "Registra una carga de 45 kWh a 0,15 € que he hecho ahora en casa",
  "¿Qué mantenimiento toca pronto?",
];

function AssistantPage() {
  const { session } = useAuth();
  const history = useChatHistory();
  const accessToken = session?.access_token;

  if (!accessToken || history.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <VoltioMark size={36} className="animate-breathe" />
      </div>
    );
  }

  return (
    <ChatWindow
      accessToken={accessToken}
      initialMessages={(history.data ?? []) as UIMessage[]}
    />
  );
}

function ChatWindow({
  accessToken,
  initialMessages,
}: {
  accessToken: string;
  initialMessages: UIMessage[];
}) {
  const queryClient = useQueryClient();
  const composerRef = useRef<HTMLDivElement>(null);
  const wasBusy = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    [accessToken],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: "voltio",
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    composerRef.current?.querySelector("textarea")?.focus();
  }, []);

  useEffect(() => {
    if (wasBusy.current && !isBusy) {
      queryClient.invalidateQueries();
      composerRef.current?.querySelector("textarea")?.focus();
    }
    wasBusy.current = isBusy;
  }, [isBusy, queryClient]);

  async function handleSubmit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text || isBusy) return;
    await sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[32rem] flex-col md:h-[calc(100dvh-6rem)]">
      <header className="mb-4 flex items-center gap-3">
        <VoltioMark size={30} />
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight">Asistente</h1>
          <p className="truncate text-xs text-muted-foreground">
            Conoce tus cargas, rutas y mantenimiento
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            {error.message || "El asistente no ha podido responder. Inténtalo otra vez."}
          </span>
        </div>
      )}

      <Conversation className="panel overflow-hidden">
        <ConversationContent className="gap-6 p-4">
          {messages.length === 0 && (
            <ConversationEmptyState
              title="Empieza a preguntar"
              description="Sobre consumo, coste, autonomía o mantenimiento. También puedes pedirle que registre una carga."
              icon={<VoltioMark size={40} />}
            />
          )}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => (
                  <PartView key={`${message.id}-${index}`} part={part} role={message.role} />
                ))}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && (
            <div className="px-1">
              <Shimmer duration={1.4}>Pensando…</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div ref={composerRef} className="mt-4">
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage({ text: prompt })}
                disabled={isBusy}
                className="panel-tight px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-energy/40 hover:text-foreground disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <PromptInput onSubmit={handleSubmit} className="panel p-2">
          <PromptInputTextarea
            placeholder="Escribe una pregunta o pide registrar una carga…"
            disabled={isBusy}
          />
          <PromptInputFooter className="justify-end px-1 pb-1">
            <PromptInputSubmit
              status={status}
              onStop={isBusy ? stop : undefined}
              disabled={status === "error"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

type Part = UIMessage["parts"][number];

function PartView({ part, role }: { part: Part; role: UIMessage["role"] }) {
  if (part.type === "text") {
    return role === "assistant" ? (
      <MessageResponse>{part.text}</MessageResponse>
    ) : (
      <span className="whitespace-pre-wrap">{part.text}</span>
    );
  }

  if (part.type === "reasoning") {
    return <ReasoningBlock text={part.text} />;
  }

  if (typeof part.type === "string" && (part.type.startsWith("tool-") || part.type === "dynamic-tool")) {
    return <ToolView part={part as ToolPart} />;
  }

  return null;
}

function ReasoningBlock({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <Collapsible className="overflow-hidden rounded-lg border border-hairline bg-muted/40">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <BrainIcon className="size-3.5" />
        <span>Razonamiento</span>
        <ChevronDownIcon className="ml-auto size-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 text-xs whitespace-pre-wrap text-muted-foreground">
        {text}
      </CollapsibleContent>
    </Collapsible>
  );
}

const TOOL_TITLES: Record<string, string> = {
  get_overview: "Resumen de tus datos",
  list_charges: "Consultando cargas",
  list_trips: "Consultando rutas",
  list_maintenance: "Consultando mantenimiento",
  log_charge: "Guardando carga",
  log_trip: "Guardando ruta",
  log_maintenance: "Guardando servicio",
};

function ToolView({ part }: { part: ToolPart }) {
  const key = part.type === "dynamic-tool" ? part.toolName : part.type.replace("tool-", "");
  const title = TOOL_TITLES[key] ?? key;

  return (
    <Tool defaultOpen={false} className="border-hairline bg-muted/30">
      <ToolHeader
        type={part.type}
        state={part.state}
        toolName={part.type === "dynamic-tool" ? part.toolName : undefined}
        title={title}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput output={part.output} errorText={part.errorText} />
      </ToolContent>
    </Tool>
  );
}

export { Badge };
