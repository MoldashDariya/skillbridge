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

export async function saveStudent(
  employerId: string,
  studentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("saved_students")
    .insert({ employer_id: employerId, student_id: studentId })
  if (error && error.code !== "23505") return { error: "Не удалось сохранить студента." }
  revalidatePath("/employer/search")
  return {}
}

export async function unsaveStudent(
  employerId: string,
  studentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("saved_students")
    .delete()
    .eq("employer_id", employerId)
    .eq("student_id", studentId)
  if (error) return { error: "Не удалось убрать из сохранённых." }
  revalidatePath("/employer/search")
  return {}
}

export async function getOrCreateDirectThread(
  employerId: string,
  studentId: string
): Promise<{ threadId?: string; error?: string }> {
  const supabase = await createClient()

  // Try to find existing thread
  const { data: existing } = await supabase
    .from("direct_threads")
    .select("id")
    .eq("employer_id", employerId)
    .eq("student_id", studentId)
    .maybeSingle()

  if (existing) return { threadId: existing.id }

  // Create new thread
  const { data: created, error } = await supabase
    .from("direct_threads")
    .insert({ employer_id: employerId, student_id: studentId })
    .select("id")
    .single()

  if (error) return { error: "Не удалось открыть чат." }
  return { threadId: created.id }
}

export async function submitStudentReview(
  applicationId: string,
  studentId: string,
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

  const { error } = await supabase.from("employer_reviews").insert({
    application_id: applicationId,
    employer_id: employer.id,
    student_id: studentId,
    rating,
    comment: comment.trim() || null,
  })

  if (error) {
    if (error.code === "23505") return { error: "Отзыв уже оставлен" }
    return { error: "Ошибка при сохранении отзыва" }
  }
  return {}
}
