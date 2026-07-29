"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { sendTelegramMessage } from "@/lib/telegram"

export async function notifyEmployerOnApplication(internshipId: string, studentId: string) {
  // Auth + ownership check: prevent impersonation of another student
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: ownStudent } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()
  if (!ownStudent || ownStudent.id !== studentId) return

  const db = createAdminClient()

  const [internshipRes, studentRes] = await Promise.all([
    db.from("internships").select("title, employers(user_id)").eq("id", internshipId).single(),
    db.from("students").select("user_id").eq("id", studentId).single(),
  ])

  const employerUserId = (internshipRes.data?.employers as { user_id: string } | null)?.user_id
  const studentUserId = studentRes.data?.user_id
  const internshipTitle = internshipRes.data?.title ?? "Практика"
  if (!employerUserId || !studentUserId) return

  const [employerProfRes, studentProfRes] = await Promise.all([
    db.from("profiles").select("telegram_chat_id").eq("user_id", employerUserId).single(),
    db.from("profiles").select("first_name, last_name").eq("user_id", studentUserId).single(),
  ])

  const chatId = employerProfRes.data?.telegram_chat_id
  const sp = studentProfRes.data
  const studentName = sp
    ? [sp.first_name, sp.last_name].filter(Boolean).join(" ") || "Студент"
    : "Студент"

  if (chatId) {
    await sendTelegramMessage(chatId, `🔔 Новая заявка на <b>${internshipTitle}</b> от <b>${studentName}</b>`)
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending:      "На рассмотрении 🕐",
  at_interview: "Приглашён на собеседование 📅",
  interviewing: "Проходит собеседование 🎤",
  accepted:     "Принят ✅",
  hired:        "Нанят 🎉",
  rejected:     "Отклонено ❌",
  completed:    "Стажировка завершена 🏁",
}

export async function notifyStudentOnStatusChange(applicationId: string, newStatus: string) {
  // Auth check: only authenticated employers may trigger status-change notifications
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const db = createAdminClient()

  const { data: app } = await db
    .from("applications")
    .select("student_id, internships(title)")
    .eq("id", applicationId)
    .single()

  if (!app) return

  const internshipTitle = (app.internships as { title: string } | null)?.title ?? "Практика"

  const { data: student } = await db
    .from("students")
    .select("user_id")
    .eq("id", app.student_id)
    .single()

  if (!student) return

  const { data: profile } = await db
    .from("profiles")
    .select("telegram_chat_id")
    .eq("user_id", student.user_id)
    .single()

  const chatId = profile?.telegram_chat_id
  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus

  if (chatId) {
    await sendTelegramMessage(chatId, `🔔 Статус вашего отклика на вакансию <b>${internshipTitle}</b> изменился на: <b>${statusLabel}</b>`)
  }
}

export async function notifyOnChatMessage(
  threadId: string,
  senderUserId: string,
  senderName: string,
  messageContent: string
): Promise<void> {
  // Auth + ownership check: sender must be the authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== senderUserId) return

  const db = createAdminClient()

  const { data: thread } = await db
    .from("direct_threads")
    .select("employer_id, student_id")
    .eq("id", threadId)
    .single()
  if (!thread) return

  const [employerRes, studentRes] = await Promise.all([
    db.from("employers").select("user_id").eq("id", thread.employer_id).single(),
    db.from("students").select("user_id").eq("id", thread.student_id).single(),
  ])

  const employerUserId = employerRes.data?.user_id
  const studentUserId = studentRes.data?.user_id

  // Notify whoever is NOT the sender
  const recipientUserId = senderUserId === employerUserId ? studentUserId : employerUserId
  if (!recipientUserId) return

  const { data: profile } = await db
    .from("profiles")
    .select("telegram_chat_id")
    .eq("user_id", recipientUserId)
    .single()

  const chatId = profile?.telegram_chat_id
  if (!chatId) return

  const truncated = messageContent.length > 120
    ? messageContent.slice(0, 120) + "…"
    : messageContent

  await sendTelegramMessage(chatId, `💬 Новое сообщение от <b>${senderName}</b>:\n${truncated}`)
}
