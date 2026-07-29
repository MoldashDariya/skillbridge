"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Anthropic from "@anthropic-ai/sdk"

export type ResumeData = {
  name: string
  contact: { email: string; phone: string; github: string; linkedin: string }
  education: Array<{ degree: string; university: string; dates: string; gpa: string; details: string[] }>
  skills: { languages: string[]; frameworks: string[]; tools: string[] }
  projects: Array<{ name: string; tech_stack: string; dates: string; bullet_points: string[] }>
  experience: Array<{ role: string; company: string; dates: string; bullet_points: string[] }>
}

export async function generateResumeData(
  studentId: string
): Promise<{ data?: ResumeData; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  const admin = createAdminClient()

  const { data: student } = await admin
    .from("students")
    .select("skills, gpa, gpa_verified, specialty, college_name, course_year, bio, github_url, linkedin_url")
    .eq("id", studentId)
    .eq("user_id", user.id)
    .single()
  if (!student) return { error: "Профиль студента не найден" }

  const [profileRes, certRes, portfolioRes, appRes] = await Promise.all([
    admin.from("profiles").select("first_name, last_name, phone").eq("user_id", user.id).single(),
    admin.from("student_certificates").select("title").eq("student_id", studentId),
    admin.from("portfolio_items").select("title, description").eq("student_id", studentId).limit(6),
    admin
      .from("applications")
      .select("status, created_at, internships(title, employers(company_name))")
      .eq("student_id", studentId)
      .in("status", ["hired", "completed", "accepted"]),
  ])

  const profile = profileRes.data
  const certs = certRes.data ?? []
  const portfolio = portfolioRes.data ?? []
  const acceptedApps = (appRes.data ?? []) as Array<{
    status: string
    created_at: string | null
    internships: { title: string; employers: { company_name: string } | null } | null
  }>

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Студент"

  const context = `
Имя: ${name}
Email: ${user.email}
Телефон: ${profile?.phone ?? "не указан"}
Колледж: ${student.college_name ?? "не указан"}
Специальность: ${student.specialty ?? "не указана"}
Курс: ${student.course_year ?? "не указан"}
GPA: ${student.gpa ?? "не указан"}${student.gpa_verified ? " (подтверждён)" : ""}
GitHub: ${student.github_url ?? "нет"}
LinkedIn: ${student.linkedin_url ?? "нет"}
О себе: ${student.bio ?? "не указано"}
Навыки: ${student.skills?.join(", ") ?? "не указаны"}

Портфолио:
${portfolio.map((p, i) => `${i + 1}. "${p.title}"${p.description ? `: ${p.description}` : ""}`).join("\n") || "Нет"}

Сертификаты: ${certs.map((c) => c.title ?? "Сертификат").join(", ") || "Нет"}

Опыт / практика:
${acceptedApps.map((a) => `- ${a.internships?.title ?? "Стажёр"} в ${a.internships?.employers?.company_name ?? "Компания"}`).join("\n") || "Нет"}
`.trim()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: "AI-сервис не настроен" }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system:
        "Ты профессиональный IT-рекрутер. На основе сырых данных о студенте, напиши сильное резюме. Сделай акцент на навыках и практике. Не выдумывай опыт, если его нет — пиши про учебные проекты. Если нет опыта работы — оставь experience пустым массивом. Если нет проектов — оставь projects пустым. Пустые поля заполняй пустой строкой.\n\nКРИТИЧНО — ЕДИНЫЙ ЯЗЫК: Определи язык резюме по данным студента (русский, английский или казахский). Используй ОДИН И ТОТ ЖЕ язык абсолютно для всего: bullet points, названия должностей, описания И даты. НЕ смешивай языки ни в одном поле. Формат дат: русский → 'Янв 2024 — Май 2025' / 'Настоящее время'; английский → 'Jan 2024 — May 2025' / 'Present'; казахский → 'Қаң 2024 — Мам 2025' / 'Қазіргі уақыт'. Разделитель дат — длинное тире '—', не дефис.",
      tools: [
        {
          name: "build_resume",
          description: "Возвращает структурированные данные резюме студента",
          input_schema: {
            type: "object" as const,
            properties: {
              name: { type: "string" },
              contact: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  phone: { type: "string" },
                  github: { type: "string" },
                  linkedin: { type: "string" },
                },
                required: ["email", "phone", "github", "linkedin"],
              },
              education: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    degree: { type: "string" },
                    university: { type: "string" },
                    dates: { type: "string" },
                    gpa: { type: "string" },
                    details: { type: "array", items: { type: "string" } },
                  },
                  required: ["degree", "university", "dates", "gpa", "details"],
                },
              },
              skills: {
                type: "object",
                properties: {
                  languages: { type: "array", items: { type: "string" } },
                  frameworks: { type: "array", items: { type: "string" } },
                  tools: { type: "array", items: { type: "string" } },
                },
                required: ["languages", "frameworks", "tools"],
              },
              projects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    tech_stack: { type: "string" },
                    dates: { type: "string" },
                    bullet_points: { type: "array", items: { type: "string" } },
                  },
                  required: ["name", "tech_stack", "dates", "bullet_points"],
                },
              },
              experience: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    company: { type: "string" },
                    dates: { type: "string" },
                    bullet_points: { type: "array", items: { type: "string" } },
                  },
                  required: ["role", "company", "dates", "bullet_points"],
                },
              },
            },
            required: ["name", "contact", "education", "skills", "projects", "experience"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "build_resume" },
      messages: [
        {
          role: "user",
          content: `Создай профессиональное резюме для студента из Казахстана:\n\n${context}`,
        },
      ],
    })

    const toolBlock = response.content.find((c) => c.type === "tool_use")
    if (!toolBlock || toolBlock.type !== "tool_use") return { error: "AI не вернул данные резюме" }
    return { data: toolBlock.input as ResumeData }
  } catch (err) {
    return { error: "Ошибка AI-генерации: " + (err instanceof Error ? err.message : "неизвестная ошибка") }
  }
}

// employerId is derived server-side from the application; client-provided value is never accepted
export async function submitEmployerReview(
  applicationId: string,
  rating: number,
  comment: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).single()
  if (!student) return { error: "Профиль не найден" }

  // IDOR prevention: verify the application belongs to this student
  const { data: app } = await supabase
    .from("applications")
    .select("internship_id")
    .eq("id", applicationId)
    .eq("student_id", student.id)
    .single()
  if (!app) return { error: "Заявка не найдена" }

  // Derive employerId server-side from the internship
  const { data: internship } = await supabase
    .from("internships")
    .select("employer_id")
    .eq("id", app.internship_id)
    .single()
  if (!internship) return { error: "Данные не найдены" }

  const { error } = await supabase.from("employer_reviews").insert({
    application_id: applicationId,
    employer_id: internship.employer_id,
    student_id: student.id,
    rating,
    comment: comment.trim() || null,
  })

  if (error) {
    if (error.code === "23505") return { error: "Отзыв уже оставлен" }
    return { error: "Ошибка при сохранении отзыва" }
  }
  return {}
}

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

  // IDOR prevention: verify the studentId belongs to the session user
  const { data: ownStudent } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()
  if (!ownStudent || ownStudent.id !== studentId) {
    return { status: "error", message: "Не авторизован" }
  }

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
