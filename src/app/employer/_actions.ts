"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function getEmployerId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data: employer } = await supabase
    .from("employers")
    .select("id")
    .eq("user_id", user.id)
    .single()
  if (!employer) throw new Error("Employer not found")
  return employer.id
}

// employerId is derived server-side from session; client-provided value is ignored
export async function saveStudent(
  studentId: string
): Promise<{ error?: string }> {
  try {
    const employerId = await getEmployerId()
    const supabase = await createClient()
    const { error } = await supabase
      .from("saved_students")
      .insert({ employer_id: employerId, student_id: studentId })
    if (error && error.code !== "23505") return { error: "Не удалось сохранить студента." }
    revalidatePath("/employer/search")
    return {}
  } catch {
    return { error: "Не авторизован" }
  }
}

export async function unsaveStudent(
  studentId: string
): Promise<{ error?: string }> {
  try {
    const employerId = await getEmployerId()
    const supabase = await createClient()
    const { error } = await supabase
      .from("saved_students")
      .delete()
      .eq("employer_id", employerId)
      .eq("student_id", studentId)
    if (error) return { error: "Не удалось убрать из сохранённых." }
    revalidatePath("/employer/search")
    return {}
  } catch {
    return { error: "Не авторизован" }
  }
}

export async function getOrCreateDirectThread(
  studentId: string
): Promise<{ threadId?: string; error?: string }> {
  try {
    const employerId = await getEmployerId()
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from("direct_threads")
      .select("id")
      .eq("employer_id", employerId)
      .eq("student_id", studentId)
      .maybeSingle()

    if (existing) return { threadId: existing.id }

    const { data: created, error } = await supabase
      .from("direct_threads")
      .insert({ employer_id: employerId, student_id: studentId })
      .select("id")
      .single()

    if (error) return { error: "Не удалось открыть чат." }
    return { threadId: created.id }
  } catch {
    return { error: "Не авторизован" }
  }
}

// studentId is derived server-side from the application; client-provided value is ignored
export async function submitStudentReview(
  applicationId: string,
  rating: number,
  comment: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Не авторизован" }

  const { data: employer } = await supabase
    .from("employers")
    .select("id")
    .eq("user_id", user.id)
    .single()
  if (!employer) return { error: "Профиль не найден" }

  // Fetch application to get student_id and internship_id
  const { data: app } = await supabase
    .from("applications")
    .select("student_id, internship_id")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Заявка не найдена" }

  // Verify the internship belongs to this employer (IDOR prevention)
  const { data: myInternship } = await supabase
    .from("internships")
    .select("id")
    .eq("id", app.internship_id)
    .eq("employer_id", employer.id)
    .single()
  if (!myInternship) return { error: "Не авторизован" }

  const { error } = await supabase.from("employer_reviews").insert({
    application_id: applicationId,
    employer_id: employer.id,
    student_id: app.student_id,
    rating,
    comment: comment.trim() || null,
  })

  if (error) {
    if (error.code === "23505") return { error: "Отзыв уже оставлен" }
    return { error: "Ошибка при сохранении отзыва" }
  }
  return {}
}
