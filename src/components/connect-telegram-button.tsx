"use client"

import { MessageCircle, CheckCircle2 } from "lucide-react"
import { useTranslation } from "@/contexts/language-context"

type Props = {
  profileId: string
  connected: boolean
}

export function ConnectTelegramButton({ profileId, connected }: Props) {
  const { t } = useTranslation()
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
  if (!botName) return null

  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-heading font-bold tracking-widest uppercase text-emerald-600">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t("common.telegram_connected")}
      </span>
    )
  }

  return (
    <a
      href={`https://t.me/${botName}?start=${profileId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] font-heading font-bold tracking-widests uppercase text-sky-600 hover:text-sky-500 transition-colors"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      {t("common.telegram_connect")}
    </a>
  )
}
