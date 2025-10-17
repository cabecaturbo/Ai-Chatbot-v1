import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./system.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runLLM(history: Array<{ role: "system"|"user"|"assistant"; content: string }>) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });
  return res.choices[0]?.message?.content || "";
}


