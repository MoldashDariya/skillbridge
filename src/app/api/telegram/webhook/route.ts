import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skillbridge-umber-chi.vercel.app"

async function reply(chatId: number, text: string) {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text: string | undefined = body?.message?.text
    const chatId: number | undefined = body?.message?.chat?.id
    const firstName: string | undefined = body?.message?.from?.first_name

    if (!chatId) return NextResponse.json({ ok: true })

    const greeting = firstName ? `Привет, ${firstName}!` : "Привет!"

    // Plain /start — no UUID
    if (!text || text === "/start") {
      await reply(
        chatId,
        `👋 ${greeting}\n\nЭто бот платформы <b>SkillBridge KZ</b>.\n\nЧтобы подключить уведомления, войдите на сайт и нажмите кнопку «Подключить Telegram» в личном кабинете.\n\n🔗 ${SITE_URL}`
      )
      return NextResponse.json({ ok: true })
    }

    // /start <uuid>
    if (text.startsWith("/start ")) {
      const profileId = text.slice(7).trim()
      if (!UUID_RE.test(profileId)) {
        await reply(chatId, `👋 ${greeting}\n\nНеверная ссылка. Перейдите на сайт и нажмите кнопку «Подключить Telegram».\n\n🔗 ${SITE_URL}`)
        return NextResponse.json({ ok: true })
      }

      const supabase = createAdminClient()
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: String(chatId) })
        .eq("id", profileId)

      if (error) {
        await reply(chatId, "⚠️ Не удалось подключить аккаунт. Попробуйте ещё раз.")
      } else {
        await reply(
          chatId,
          `✅ ${greeting} Ваш Telegram успешно подключён к SkillBridge KZ!\n\nТеперь вы будете получать уведомления:\n• О новых заявках (для работодателей)\n• Об изменении статуса заявки (для студентов)\n\nВернитесь на сайт: ${SITE_URL}`
        )
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
