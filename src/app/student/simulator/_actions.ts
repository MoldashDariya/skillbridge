"use server"

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import type { Locale } from "@/lib/i18n"
import { containsProfanity, getProfanityWarning } from "@/lib/profanityFilter"

export async function getElevenLabsSignedUrl(): Promise<{ url: string } | { error: string }> {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  const apiKey  = process.env.ELEVENLABS_API_KEY
  if (!agentId || !apiKey) return { error: "ElevenLabs не настроен" }
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } }
    )
    if (!res.ok) return { error: `ElevenLabs API: ${res.status}` }
    const { signed_url } = await res.json()
    return { url: signed_url }
  } catch {
    return { error: "Не удалось получить доступ к AI-интервьюеру" }
  }
}

export type QAndAItem = {
  question: string
  answer: string
  score: number
  explanation: string
}

export type StructuredFeedback = {
  strengths: string
  improvements: string
  confidence_score: string
  completeness: string
  recommendations: string
  overall_result: string
}

export type EvaluationResult = {
  q_and_a: QAndAItem[]
  strengths: string
  improvements: string
  confidence_score: string
  completeness: string
  recommendations: string
  overall_result: string
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
    return `You are an experienced HR analyst. You are given a transcript of a practice voice interview between an AI interviewer (Skilly) and a candidate.

Your tasks:
1. Extract substantive questions and answers (skip greetings, reactions like "Thanks!", and farewells from q_and_a).
2. Rate each answer on a scale of 1–10.
3. Prepare structured feedback:
   - strengths: one paragraph describing the candidate's strong points
   - improvements: one paragraph describing areas to develop
   - confidence_score: candidate's confidence level as "X/10"
   - completeness: how completely they answered questions as "X%"
   - recommendations: 2–3 specific, actionable recommendations for a real interview
   - overall_result: brief verdict, e.g. "Ready for a real interview" or "Needs more preparation"

Respond ONLY with JSON, no extra text:
{"q_and_a":[{"question":"...","answer":"...","score":1,"explanation":"..."}],"strengths":"...","improvements":"...","confidence_score":"X/10","completeness":"X%","recommendations":"...","overall_result":"..."}`
  }
  if (language === "kz") {
    return `Сен тәжірибелі HR-аналитиксің. Сізге AI-интервьюер (Скилли) мен үміткер арасындағы оқу дауыстық сұхбаттың транскрипті берілген.

Міндетің:
1. Маңызды сұрақтар мен жауаптарды бөліп ал (сәлемдесу, "Рахмет!" сияқты реакциялар және қоштасуды q_and_a-дан алып тастаңыз).
2. Әр жауапты 1–10 шкала бойынша бағала.
3. Құрылымдалған кері байланыс дайында:
   - strengths: үміткердің күшті тұстарын бір абзацта сипатта
   - improvements: дамыту қажет бағыттарды бір абзацта сипатта
   - confidence_score: үміткердің сенімділік деңгейі "X/10" форматында
   - completeness: сұрақтарға жауап толықтығы "X%" форматында
   - recommendations: нақты сұхбатқа арналған 2–3 нақты ұсыныс
   - overall_result: қысқаша үкім, мысалы "Нақты сұхбатқа дайын" немесе "Қосымша дайындық қажет"

Тек JSON форматында жауап бер, түсіндірмесіз:
{"q_and_a":[{"question":"...","answer":"...","score":1,"explanation":"..."}],"strengths":"...","improvements":"...","confidence_score":"X/10","completeness":"X%","recommendations":"...","overall_result":"..."}`
  }
  return `Ты опытный HR-аналитик. Тебе предоставлена расшифровка учебного голосового собеседования между AI-интервьюером (Скилли) и кандидатом.

Твоя задача:
1. Выдели содержательные вопросы и ответы (исключи приветствие, реакции типа "Спасибо за ответ!" и прощание из q_and_a).
2. Оцени каждый ответ по шкале 1-10.
3. Подготовь структурированную обратную связь:
   - strengths: одним абзацем опиши сильные стороны кандидата
   - improvements: одним абзацем опиши зоны роста
   - confidence_score: уровень уверенности кандидата в формате "X/10"
   - completeness: насколько полно были даны ответы в формате "X%"
   - recommendations: 2–3 конкретные рекомендации для подготовки к настоящему собеседованию
   - overall_result: краткий вердикт, например "Готов к реальному собеседованию" или "Нужна дополнительная подготовка"

Отвечай ТОЛЬКО JSON без пояснений:
{"q_and_a":[{"question":"...","answer":"...","score":1,"explanation":"..."}],"strengths":"...","improvements":"...","confidence_score":"X/10","completeness":"X%","recommendations":"...","overall_result":"..."}`
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
  finalFeedback?: StructuredFeedback
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
