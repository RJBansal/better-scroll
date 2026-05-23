import { GoogleGenAI } from "@google/genai";

const AGENT_ID = "antigravity-preview-05-2026";

/** 10 minutes — antigravity spins up a sandbox, searches, and writes files */
const TIMEOUT_MS = 10 * 60 * 1000;

export interface ManagedAgentRunInput {
  input: string;
  systemInstruction?: string;
}

export interface ManagedAgentResult {
  outputText: string;
  interactionId: string;
  raw: unknown;
}

export async function runManagedAgent(opts: ManagedAgentRunInput): Promise<ManagedAgentResult> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: TIMEOUT_MS } });

  console.log(`[managed-agent] Creating interaction with ${AGENT_ID} (timeout: ${TIMEOUT_MS / 1000}s)…`);

  const interaction = await ai.interactions.create(
    {
      agent: AGENT_ID,
      input: opts.input,
      environment: "remote",
      system_instruction: opts.systemInstruction,
    },
    { timeout: TIMEOUT_MS },
  );

  const outputText = interaction.output_text ?? "";
  console.log(`[managed-agent] Interaction ${interaction.id} completed (${outputText.length} chars)`);

  return {
    outputText,
    interactionId: interaction.id,
    raw: interaction,
  };
}
