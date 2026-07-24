"use server"

import Anthropic from "@anthropic-ai/sdk"

export type SkillyMessage = {
  role: "user" | "assistant"
  content: string
}

export type SkillyResult =
  | { type: "text"; content: string }
  | { type: "navigate"; destination: "interview" | "resume" | "vacancies" }

const client = new Anthropic()

const NAVIGATE_TOOL: Anthropic.Tool = {
  name: "navigate_to_module",
  description: "Redirect the student to a specific platform module",
  input_schema: {
    type: "object" as const,
    properties: {
      destination: {
        type: "string",
        enum: ["interview", "resume", "vacancies"],
        description: "The module to navigate to",
      },
    },
    required: ["destination"],
  },
}

export async function askSkilly(history: SkillyMessage[]): Promise<SkillyResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `Ты — Skilly AI, персональный ассистент платформы SkillBridge для студентов Казахстана.
Отвечай кратко, дружелюбно и строго на русском языке.

Если пользователь хочет:
- порепетировать собеседование, потренироваться отвечать на вопросы — navigate_to_module destination="interview"
- создать, скачать или сгенерировать резюме — navigate_to_module destination="resume"
- найти вакансии, место практики, стажировку — navigate_to_module destination="vacancies"

В этих случаях НЕ объясняй, как найти раздел — немедленно вызывай инструмент.`,
    tools: [NAVIGATE_TOOL],
    tool_choice: { type: "auto" },
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  })

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "navigate_to_module") {
      const { destination } = block.input as { destination: "interview" | "resume" | "vacancies" }
      return { type: "navigate", destination }
    }
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")
  return { type: "text", content: textBlock?.text ?? "Не понял вопрос, попробуй переформулировать." }
}
