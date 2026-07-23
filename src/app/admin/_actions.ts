"use server"

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

export async function uploadCollegeRoster(
  items: RosterItem[]
): Promise<{ error?: string; count?: number }> {
  await assertAdmin()
  if (items.length === 0) return { error: "CSV файл пустой или не содержит данных" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: adminData } = await admin
    .from("college_admins")
    .select("college_name")
    .eq("user_id", user!.id)
    .single()

  if (!adminData?.college_name) return { error: "Не удалось определить колледж администратора" }

  const rows = items.map(item => ({
    full_name: item.full_name.trim(),
    identifier: item.identifier.trim(),
    specialty: item.specialty?.trim() || null,
    group_name: item.group_name?.trim() || null,
    college_name: adminData.college_name,
  }))

  const { error } = await admin
    .from("official_college_roster")
    .upsert(rows, { onConflict: "college_name,identifier" })

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
