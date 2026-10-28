import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { MetaProposalConfig } from "./config";
import type { ResponseFormatJSONSchema } from "openai/resources/shared";

export type MetaFetch = typeof globalThis.fetch;
export class InvalidMetaOutput extends Error {
  constructor(message = "Invalid structured response.", public readonly missingUsage = false) { super(message); }
}

const ReplySchema = z.object({
  content: z.string().max(32_768),
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable(),
  model: z.string().max(100),
  usage: z.object({
    inputTokens: z.number().int().nonnegative().max(1_000_000).nullable(),
    outputTokens: z.number().int().nonnegative().max(1_000_000).nullable(),
  }).strict().nullable(),
}).strict();

export async function requestMetaJson(request: {
  config: MetaProposalConfig;
  instructions: string;
  payload: unknown;
  responseFormat: ResponseFormatJSONSchema;
  signal: AbortSignal;
  fetch?: MetaFetch;
}) {
  const { config } = request;
  const client = new OpenAI({
    apiKey: config.apiKey, baseURL: config.baseURL,
    timeout: config.timeoutMs, maxRetries: 0, fetch: request.fetch, logLevel: "off",
  });
  const response = await client.chat.completions.create({
    model: config.model,
    reasoning_effort: "low",
    max_tokens: config.maxOutputTokens,
    response_format: request.responseFormat,
    messages: [
      { role: "system", content: request.instructions },
      { role: "user", content: JSON.stringify(request.payload) },
    ],
    store: false,
  }, { signal: request.signal });
  const choice = response.choices?.[0];
  if (!choice || choice.finish_reason !== "stop" || choice.message.tool_calls?.length ||
      choice.message.refusal || response.model !== config.model)
    throw new InvalidMetaOutput("Invalid structured response.", true);
  const parsed = ReplySchema.safeParse({
    content: choice.message.content,
    requestId: response._request_id ?? null,
    model: response.model,
    usage: response.usage ? {
      inputTokens: response.usage.prompt_tokens ?? null,
      outputTokens: response.usage.completion_tokens ?? null,
    } : null,
  });
  if (!parsed.success) throw new InvalidMetaOutput("Invalid structured response.", true);
  return parsed.data;
}
