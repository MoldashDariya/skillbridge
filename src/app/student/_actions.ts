"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Anthropic from "@anthropic-ai/sdk"

export type GapSkill = { skill: string; plan: string[] }

export type SkillGapResult =
  | { status: "ok"; gaps: GapSkill[] }
  | { status: "no_portfolio" }
  | { status: "error"; message: string }

export async function analyzeSkillGap(
  studentId: string,
  internshipId: string
): Promise<SkillGapResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: "error", message: "Не авторизован" }

  const admin = createAdminClient()

  const { data: cached } = await admin
    .from("ai_skill_gaps")
    .select("missing_skills")
    .eq("student_id", studentId)
    .eq("internship_id", internshipId)
    .single()

  if (cached) return { status: "ok", gaps: cached.missing_skills as GapSkill[] }

  const [studentRes, portfolioRes, internshipRes] = await Promise.all([
    admin.from("students").select("skills").eq("id", studentId).single(),
    admin.from("portfolio_items").select("title, description").eq("student_id", studentId).limit(5),
    admin.from("internships").select("title, requirements").eq("id", internshipId).single(),
  ])

  const student = studentRes.data
  const portfolio = portfolioRes.data ?? []
  const internship = internshipRes.data

  if (!student || !internship) return { status: "error", message: "Данные не найдены" }
  if (portfolio.length === 0) return { status: "no_portfolio" }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { status: "error", message: "AI-анализ не настроен" }

  const client = new Anthropic({ apiKey })

  const prompt = `You are a career advisor helping students in Kazakhstan find internships.

Internship: ${internship.title}
Requirements: ${internship.requirements ?? "не указаны"}

Student skills: ${student.skills?.join(", ") || "не указаны"}
Portfolio projects: ${portfolio.map(p => p.title + (p.description ? ` (${p.description})` : "")).join("; ")}

Identify 2-3 specific skills the student is missing for this internship. For each missing skill, provide a concrete 2-step action plan in Russian. Be specific and practical.

Return ONLY a JSON array with this exact structure, no other text:
[{"skill":"Название навыка","plan":["Конкретный шаг 1","Конкретный шаг 2"]}]`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    })

    let text = message.content[0].type === "text" ? message.content[0].text.trim() : "[]"
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) text = fenceMatch[1].trim()
    const gaps: GapSkill[] = JSON.parse(text)

    await admin.from("ai_skill_gaps").upsert(
      { student_id: studentId, internship_id: internshipId, missing_skills: gaps },
      { onConflict: "student_id,internship_id" }
    )

    return { status: "ok", gaps }
  } catch {
    return { status: "error", message: "Ошибка AI-анализа. Попробуйте позже." }
  }
}
