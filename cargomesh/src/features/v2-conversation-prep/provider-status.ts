import type { z } from "zod";
import type { ProposalErrorSchema } from "@/shared/schemas/meta/model-proposal";

export type ConversationProviderMode = "META" | "BEDROCK" | "DETERMINISTIC";
export function providerStatus(mode: ConversationProviderMode | null,
  error: z.infer<typeof ProposalErrorSchema> | null, language: "es" | "en"): string | null {
  if (error?.code === "NOT_CONFIGURED") return language === "es"
    ? "Meta aún no está conectado. Puedes continuar con la guía por reglas o el formulario."
    : "Meta is not connected yet. You can continue with rule-based guidance or the form.";
  if (error) return language === "es"
    ? "No pudimos analizar el mensaje con Meta. Tus datos se conservan; puedes reintentar o usar el formulario."
    : "We could not analyze the message with Meta. Your details are preserved; retry or use the form.";
  if (mode === "META") return language === "es"
    ? "Meta Muse · Revisa los datos propuestos antes de confirmar."
    : "Meta Muse · Review the proposed details before confirming.";
  if (mode === "BEDROCK") return language === "es"
    ? "Amazon Bedrock · Las acciones requieren confirmación."
    : "Amazon Bedrock · Actions require confirmation.";
  if (mode === "DETERMINISTIC") return language === "es"
    ? "Guía por reglas · Puedes completar o corregir los datos en el formulario."
    : "Rule-based guidance · You can complete or correct details in the form.";
  return null;
}

export function interpretationStillCurrent(
  started: { draft: string; scope: string; revision: number },
  current: { draft: string; scope: string; revision?: number },
  responseRevision: number | undefined,
) {
  return started.draft === current.draft && started.scope === current.scope &&
    (current.revision === undefined || current.revision === started.revision) &&
    (responseRevision === undefined || responseRevision === started.revision);
}
