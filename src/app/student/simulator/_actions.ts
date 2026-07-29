"use server"

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import type { Locale } from "@/lib/i18n"
import { containsProfanity, getProfanityWarning } from "@/lib/profanityFilter"

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

const EVAL_ERRORS: Record<Locale, string> = {
  ru: "AI не настроен",
  kz: "AI баптандырылмаған",
  en: "AI is not configured",
}

const EVAL_FAIL: Record<Locale, string> = {
  ru: "Ошибка при анализе собеседования.",
  kz: "Сұхбатты талдау кезінде қате орын алды.",
  en: "An error occurred while analysing the interview.",
}

function buildEvalSystem(language: Locale): string {
  if (language === "en") {
    return `You are an experienced HR analyst. You are given a transcript of a voice interview between HR and a candidate.

Your tasks:
1. Extract only the technical questions and answers (exclude greetings, small talk, and farewells from q_and_a).
2. Rate each technical answer on a scale of 1–10.
3. Identify the candidate's strengths and weaknesses based on the full interview.
4. Write a brief overall feedback IN ENGLISH.

Respond ONLY with JSON, no extra text:
{"q_and_a":[{"question":"...","answer":"...","score":1-10,"explanation":"brief explanation"}],"strengths":["..."],"weaknesses":["..."],"overall_feedback":"..."}`
  }
  if (language === "kz") {
    return `Сен тәжірибелі HR-аналитиксің. Сізге HR мен үміткер арасындағы дауыстық сұхбаттың транскрипті берілген.

Міндетің:
1. Тек техникалық сұрақтар мен жауаптарды бөліп ал (сәлемдесуді, бөтен сөздерді q_and_a-дан алып тастаңыз).
2. Әр техникалық жауапты 1–10 шкала бойынша бағала.
3. Бүкіл сұхбат негізінде үміткердің күшті және әлсіз тұстарын анықта.
4. ҚАЗАҚ ТІЛІНДЕ қысқаша қорытынды пікір жаз.

Тек JSON форматында жауап бер, түсіндірмесіз:
{"q_and_a":[{"question":"...","answer":"...","score":1-10,"explanation":"қысқаша түсіндірме"}],"strengths":["..."],"weaknesses":["..."],"overall_feedback":"..."}`
  }
  return `Ты опытный HR-аналитик. Тебе предоставлена расшифровка голосового собеседования между HR и кандидатом.

Твоя задача:
1. Выдели только технические вопросы и ответы на них (исключи приветствие, светскую беседу и прощание из q_and_a).
2. Оцени каждый технический ответ по шкале 1-10.
3. Определи сильные и слабые стороны кандидата на основе всего собеседования.
4. Дай краткий итоговый фидбэк на русском языке.

Отвечай ТОЛЬКО JSON без пояснений:
{"q_and_a":[{"question":"...","answer":"...","score":1-10,"explanation":"краткое объяснение оценки"}],"strengths":["..."],"weaknesses":["..."],"overall_feedback":"..."}`
}

export async function evaluateTranscript(
  transcriptText: string,
  specialty: string,
  language: Locale = "ru",
): Promise<EvaluationResult | { error: string }> {
  // Auth check — prevents unauthenticated LLM quota drain
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: EVAL_ERRORS[language] }

  if (containsProfanity(transcriptText)) {
    return { error: getProfanityWarning(language) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: EVAL_ERRORS[language] }
  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: buildEvalSystem(language),
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
    return { error: EVAL_FAIL[language] }
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  // IDOR prevention: verify studentId belongs to the session user
  const { data: ownStudent } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()
  if (!ownStudent || ownStudent.id !== studentId) return { error: "Не авторизован" }

  const { data, error } = await supabase
    .from("interview_simulations")
    .insert({
      student_id: ownStudent.id,
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
