"use server"

import Anthropic from "@anthropic-ai/sdk"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()
  if (profile?.role !== "college_admin") throw new Error("Unauthorized")
}

export async function approveUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from("profiles").update({ approval_status: "approved" }).eq("user_id", userId)
  revalidatePath("/admin")
}

export async function rejectUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from("profiles").update({ approval_status: "rejected" }).eq("user_id", userId)
  revalidatePath("/admin")
}

export async function updateStudentPassport(
  studentId: string,
  data: { gpa_verified?: boolean; attendance_percent?: number | null }
) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from("students").update(data).eq("id", studentId)
  revalidatePath("/admin")
}

export async function completeApplication(applicationId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from("applications").update({ status: "completed" }).eq("id", applicationId)
  revalidatePath(`/admin/applications/${applicationId}`)
  revalidatePath("/admin")
}

export type RosterItem = {
  full_name: string
  identifier: string
  specialty?: string | null
  group_name?: string | null
}

// ── Column mapping ──────────────────────────────────────────────────────────

const COL_MAP: Record<string, keyof RosterItem> = {
  фио: "full_name", fullname: "full_name", name: "full_name", имя: "full_name",
  студент: "full_name", фиостудента: "full_name", ученик: "full_name",
  иин: "identifier", iin: "identifier", identifier: "identifier", ид: "identifier",
  id: "identifier", studentid: "identifier", идентификатор: "identifier",
  номер: "identifier", код: "identifier",
  специальность: "specialty", specialty: "specialty", спец: "specialty",
  группа: "group_name", group: "group_name", groupname: "group_name",
  группакласс: "group_name", класс: "group_name",
}

function normalizeHeader(h: string) {
  return h.toLowerCase().trim().replace(/[\s\-\/\.]+/g, "")
}

type ColumnMapping = {
  full_name: string | null
  identifier: string | null
  specialty: string | null
  group_name: string | null
}

function fastMapColumns(headers: string[]): ColumnMapping {
  const result: ColumnMapping = { full_name: null, identifier: null, specialty: null, group_name: null }
  for (const h of headers) {
    const field = COL_MAP[normalizeHeader(h)]
    if (field && result[field] === null) result[field] = h
  }
  return result
}

async function aiMapColumns(headers: string[], sampleRow: Record<string, string>): Promise<ColumnMapping> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    tools: [{
      name: "map_columns",
      description: "Map CSV column headers to database schema fields",
      input_schema: {
        type: "object",
        properties: {
          full_name:  { type: "string", description: "Exact CSV column name for student full name (ФИО, Студент, Ученик…), or empty string if absent" },
          identifier: { type: "string", description: "Exact CSV column name for student ID/IIN/code (ИИН, Код, ID, Номер…), or empty string if absent" },
          specialty:  { type: "string", description: "Exact CSV column name for specialty/major (Специальность, Спец.…), or empty string if absent" },
          group_name: { type: "string", description: "Exact CSV column name for group or class (Группа, Класс…), or empty string if absent" },
        },
        required: ["full_name", "identifier", "specialty", "group_name"],
      },
    }],
    tool_choice: { type: "tool", name: "map_columns" },
    messages: [{
      role: "user",
      content: `Map these CSV column headers to the schema fields.

Headers: ${JSON.stringify(headers)}
Sample row: ${JSON.stringify(sampleRow)}

Return the exact header string for each field, or empty string if no column matches.`,
    }],
  })

  const toolBlock = response.content.find(c => c.type === "tool_use")
  if (!toolBlock || toolBlock.type !== "tool_use") throw new Error("No tool_use block in LLM response")

  const input = toolBlock.input as Record<string, string>
  return {
    full_name:  input.full_name  || null,
    identifier: input.identifier || null,
    specialty:  input.specialty  || null,
    group_name: input.group_name || null,
  }
}

async function resolveColumnMapping(headers: string[], sampleRow: Record<string, string>): Promise<ColumnMapping> {
  const fast = fastMapColumns(headers)
  if (fast.full_name && fast.identifier) return fast
  return aiMapColumns(headers, sampleRow)
}

// ── Server action ────────────────────────────────────────────────────────────

export async function uploadCollegeRoster(
  rawRows: Record<string, string>[]
): Promise<{ error?: string; count?: number }> {
  await assertAdmin()
  if (rawRows.length === 0) return { error: "CSV файл пустой или не содержит данных" }

  const headers = Object.keys(rawRows[0])

  let mapping: ColumnMapping
  try {
    mapping = await resolveColumnMapping(headers, rawRows[0])
  } catch {
    return { error: "Не удалось определить структуру CSV. Проверьте заголовки колонок." }
  }

  if (!mapping.full_name || !mapping.identifier) {
    return { error: `Не найдены колонки ФИО и ИИН. Колонки в файле: ${headers.join(", ")}` }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: adminData } = await admin
    .from("college_admins")
    .select("college_name")
    .eq("user_id", user!.id)
    .single()

  if (!adminData?.college_name) return { error: "Не удалось определить колледж администратора" }

  const rows = rawRows
    .map(raw => ({
      full_name:    raw[mapping.full_name!]?.trim() ?? "",
      identifier:   raw[mapping.identifier!]?.trim() ?? "",
      specialty:    mapping.specialty  ? (raw[mapping.specialty]?.trim()  || null) : null,
      group_name:   mapping.group_name ? (raw[mapping.group_name]?.trim() || null) : null,
      college_name: adminData.college_name,
    }))
    .filter(r => r.full_name && r.identifier)

  if (rows.length === 0) return { error: "CSV не содержит строк с заполненными ФИО и ИИН" }

  const { error } = await admin
    .from("official_college_roster")
    .upsert(rows, { onConflict: "college_name,identifier", ignoreDuplicates: true })

  if (error) return { error: "Ошибка при загрузке: " + error.message }

  revalidatePath("/admin")
  return { count: rows.length }
}

export async function saveTeacherFeedback(
  applicationId: string,
  feedback: string
): Promise<{ error?: string }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from("applications")
    .update({ teacher_feedback: feedback || null })
    .eq("id", applicationId)
  if (error) return { error: "Не удалось сохранить отзыв. Попробуйте ещё раз." }
  revalidatePath(`/admin/applications/${applicationId}`)
  return {}
}
