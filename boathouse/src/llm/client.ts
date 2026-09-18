// Single server-side Anthropic client. Never imported by client components.
// The key is read from ANTHROPIC_API_KEY by the SDK; it is never sent to the browser.

import Anthropic from "@anthropic-ai/sdk";

/** Amendment A5: fixed model, server-side only. */
export const MODEL = "claude-haiku-4-5-20251001";
export const TIMEOUT_MS = 20_000;

export class LlmUnavailableError extends Error {}

let cached: Anthropic | null = null;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getClient(): Anthropic {
  if (!hasApiKey()) throw new LlmUnavailableError("ANTHROPIC_API_KEY is not set");
  cached ??= new Anthropic({ timeout: TIMEOUT_MS });
  return cached;
}

/** What a feature needs back from one Messages API call. */
export interface LlmReply {
  text: string;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
}

export interface LlmCall {
  feature: "intake" | "donor";
  system: string;
  user: string;
  temperature: number;
  max_tokens: number;
}

/** Signature that lets tests inject a fake model. */
export type CallModel = (call: LlmCall) => Promise<LlmReply>;

/** One Messages API call with a per-call log line (no key, no org ids, no request text). */
export const callModel: CallModel = async (call) => {
  const client = getClient();
  const started = Date.now();
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: call.max_tokens,
      temperature: call.temperature,
      system: call.system,
      messages: [{ role: "user", content: call.user }],
    });
    const text = message.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("");
    const reply: LlmReply = {
      text,
      stop_reason: message.stop_reason,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    };
    logCall(call.feature, call.temperature, reply, Date.now() - started, null);
    return reply;
  } catch (err) {
    logCall(call.feature, call.temperature, null, Date.now() - started, err);
    throw err;
  }
};

function logCall(feature: string, temperature: number, reply: LlmReply | null, latencyMs: number, err: unknown): void {
  const line = {
    llm: feature,
    model: MODEL,
    temperature,
    input_tokens: reply?.input_tokens ?? null,
    output_tokens: reply?.output_tokens ?? null,
    stop_reason: reply?.stop_reason ?? null,
    latency_ms: latencyMs,
    error: err instanceof Error ? err.message : err ? String(err) : null,
  };
  console.log(JSON.stringify(line));
}
