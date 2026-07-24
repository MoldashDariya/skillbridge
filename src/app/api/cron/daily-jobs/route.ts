import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = createAdminClient()

  // All profiles that have linked Telegram
  const { data: profiles } = await db
    .from("profiles")
    .select("user_id, telegram_chat_id")
    .not("telegram_chat_id", "is", null)

  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const profile of profiles) {
    const chatId = profile.telegram_chat_id!

    const { data: student } = await db
      .from("students")
      .select("id, skills, specialty")
      .eq("user_id", profile.user_id)
      .single()

    if (!student) continue

    // IDs the student already applied to
    const { data: applied } = await db
      .from("applications")
      .select("internship_id")
      .eq("student_id", student.id)

    const appliedIds = applied?.map((a) => a.internship_id) ?? []

    // Build internship query — active, specialty-matched, not already applied
    let query = db
      .from("internships")
      .select("id, title, city, format, specialty")
      .eq("status", "active")

    if (student.specialty) {
      query = query.or(`specialty.is.null,specialty.ilike.${student.specialty}`)
    }

    if (appliedIds.length > 0) {
      query = query.not("id", "in", `(${appliedIds.join(",")})`)
    }

    const { data: jobs } = await query.limit(5)

    if (!jobs?.length) continue

    const lines = jobs
      .map((j, i) => {
        const meta = [j.city, j.format].filter(Boolean).join(", ")
        return `${i + 1}. <b>${j.title}</b>${meta ? ` — ${meta}` : ""}`
      })
      .join("\n")

    await sendTelegramMessage(
      chatId,
      `🚀 <b>Новые вакансии для вас:</b>\n\n${lines}\n\n<i>Откройте SkillBridge, чтобы откликнуться</i>`
    )
    sent++
  }

  return NextResponse.json({ sent })
}
