// ============================================================
// _shared/claude.ts — Shared utilities for all Intelligence edge functions
// ============================================================

import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

// ── Types ─────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface ClaudeSearchResponse {
  content: string;
  searchResults: any[];
}

// ── CORS Headers ──────────────────────────────────────────────

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-evidly-bridge-secret, x-evidly-intelligence-secret",
};

// ── callClaude ────────────────────────────────────────────────

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

export async function callClaude(
  messages: Message[],
  options?: { maxTokens?: number; systemPrompt?: string }
): Promise<ClaudeResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const maxTokens = options?.maxTokens ?? 4000;
  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages,
  };
  if (options?.systemPrompt) {
    body.system = options.systemPrompt;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const resp = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        // Retry on 429 (rate limit) and 5xx (server errors)
        if ((resp.status === 429 || resp.status >= 500) && attempt < RETRY_DELAYS.length) {
          lastError = new Error(`Claude API ${resp.status}: ${errText}`);
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        throw new Error(`Claude API ${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      const textBlock = data.content?.find((b: any) => b.type === "text");
      return {
        content: textBlock?.text ?? "",
        usage: {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
        },
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
    }
  }

  throw lastError ?? new Error("callClaude failed after retries");
}

// ── callClaudeWithSearch ──────────────────────────────────────

export async function callClaudeWithSearch(
  query: string,
  systemPrompt: string
): Promise<ClaudeSearchResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: query }],
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const resp = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        if ((resp.status === 429 || resp.status >= 500) && attempt < RETRY_DELAYS.length) {
          lastError = new Error(`Claude API ${resp.status}: ${errText}`);
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        throw new Error(`Claude API ${resp.status}: ${errText}`);
      }

      const data = await resp.json();

      // Extract text content and search results from response blocks
      let textContent = "";
      const searchResults: any[] = [];

      for (const block of data.content ?? []) {
        if (block.type === "text") {
          textContent += block.text;
        }
        if (block.type === "web_search_tool_result") {
          searchResults.push(block);
        }
      }

      return { content: textContent, searchResults };
    } catch (err) {
      lastError = err as Error;
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
    }
  }

  throw lastError ?? new Error("callClaudeWithSearch failed after retries");
}

// ── generateHash ──────────────────────────────────────────────

export function generateHash(content: string): string {
  const data = new TextEncoder().encode(content);
  const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
  return encodeHex(new Uint8Array(hashBuffer));
}

// ── validateWebhookSecret ─────────────────────────────────────

export function validateWebhookSecret(request: Request): boolean {
  const secret = Deno.env.get("BRIDGE_SECRET");
  if (!secret) return false;
  const header = request.headers.get("x-evidly-bridge-secret");
  if (!header) return false;
  return header === secret;
}

// ── Helpers ───────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
