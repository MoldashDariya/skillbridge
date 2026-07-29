"use server"

import Anthropic from "@anthropic-ai/sdk"
import type { Locale } from "@/lib/i18n"
import { containsProfanity, getProfanityWarning } from "@/lib/profanityFilter"
import { createClient } from "@/lib/supabase/server"

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

function buildSystem(language: Locale): string {
  if (language === "en") {
    return `You are Skilly AI, a personal assistant for the SkillBridge platform for students in Kazakhstan.
Reply briefly, in a friendly manner, and STRICTLY IN ENGLISH. Never switch languages.

If the user wants to:
- practice for an interview, train answering questions → call navigate_to_module destination="interview"
- create, download, or generate a resume → call navigate_to_module destination="resume"
- find vacancies, an internship, or a traineeship → call navigate_to_module destination="vacancies"

In those cases do NOT explain how to find the section — call the tool immediately.`
  }
  if (language === "kz") {
    return `Сен — Skilly AI, Қазақстан студенттері үшін SkillBridge платформасының жеке ассистентісің.
Тек ҚАЗАҚ ТІЛІНДЕ ғана жауап бер. Тілді өзгертпе.

Егер пайдаланушы:
- сұхбат жаттықтырғысы немесе сұрақтарға жауап беруді дамытқысы келсе → navigate_to_module destination="interview"
- түйіндеме жасап немесе жүктегісі келсе → navigate_to_module destination="resume"
- жұмыс немесе тәжірибе орнын іздесе → navigate_to_module destination="vacancies"

Мұндай жағдайда бөлімді қалай табуды түсіндірме — дереу аспапты шақыр.`
  }
  return `Ты — Skilly AI, персональный ассистент платформы SkillBridge для студентов Казахстана.
Отвечай кратко, дружелюбно и строго на русском языке. Никогда не переходи на другой язык.

Если пользователь хочет:
- порепетировать собеседование, потренироваться отвечать на вопросы → navigate_to_module destination="interview"
- создать, скачать или сгенерировать резюме → navigate_to_module destination="resume"
- найти вакансии, место практики, стажировку → navigate_to_module destination="vacancies"

В этих случаях НЕ объясняй, как найти раздел — немедленно вызывай инструмент.`
}

export async function askSkilly(
  history: SkillyMessage[],
  language: Locale = "ru",
): Promise<SkillyResult> {
  // Auth check — prevents unauthenticated LLM quota drain
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { type: "text", content: "Пожалуйста, войдите в систему." }

  const lastUserMsg = [...history].reverse().find((m) => m.role === "user")
  if (lastUserMsg && containsProfanity(lastUserMsg.content)) {
    return { type: "text", content: getProfanityWarning(language) }
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: buildSystem(language),
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
