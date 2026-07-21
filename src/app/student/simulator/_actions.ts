"use server"

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"

export type QAndAItem = {
  question: string
  answer: string
  score: number
  explanation: string
}

export type FinalFeedback = {
  strengths: string[]
  weaknesses: string[]
  overall_feedback: string
}

export type EvaluationResult = {
  q_and_a: QAndAItem[]
  strengths: string[]
  weaknesses: string[]
  overall_feedback: string
}

function parseJSON<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return JSON.parse(fence ? fence[1].trim() : text.trim()) as T
}

const EVAL_SYSTEM = `Ты опытный HR-аналитик. Тебе предоставлена расшифровка голосового собеседования между HR и кандидатом.

Твоя задача:
1. Выдели только технические вопросы и ответы на них (исключи приветствие, светскую беседу и прощание из q_and_a).
2. Оцени каждый технический ответ по шкале 1-10.
3. Определи сильные и слабые стороны кандидата на основе всего собеседования.
4. Дай краткий итоговый фидбэк на русском языке.

Отвечай ТОЛЬКО JSON без пояснений:
{"q_and_a":[{"question":"...","answer":"...","score":1-10,"explanation":"краткое объяснение оценки"}],"strengths":["..."],"weaknesses":["..."],"overall_feedback":"..."}`

export async function evaluateTranscript(
  transcriptText: string,
  specialty: string
): Promise<EvaluationResult | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: "AI не настроен" }
  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: EVAL_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Расшифровка собеседования на позицию: ${specialty}\n\n${transcriptText}`,
        },
      ],
    })
    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    return parseJSON<EvaluationResult>(text)
  } catch {
    return { error: "Ошибка при анализе собеседования." }
  }
}

export async function saveSimulation(
  studentId: string,
  specialty: string,
  qAndA: QAndAItem[],
  averageScore: number,
  finalFeedback?: FinalFeedback
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }
  const { data, error } = await supabase
    .from("interview_simulations")
    .insert({
      student_id: studentId,
      specialty,
      q_and_a: qAndA,
      average_score: averageScore,
      final_feedback: finalFeedback ?? null,
    })
    .select("id")
    .single()
  if (error) return { error: "Ошибка при сохранении." }
  return { id: data.id }
}
