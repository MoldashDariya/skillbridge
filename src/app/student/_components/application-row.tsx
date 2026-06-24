"use client"

import Link from "next/link"
import { ApplicationChatDialog } from "@/components/application-chat-dialog"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",  cls: "text-blue-700 border-blue-300 bg-blue-50" },
  at_interview: { label: "На собеседовании", cls: "text-blue-600 border-blue-300 bg-blue-50" },
  accepted:     { label: "Принят",           cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Нанят",            cls: "text-emerald-700 border-emerald-400 bg-emerald-100" },
  rejected:     { label: "Отклонено",        cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

type Props = {
  item: {
    id: string
    status: string | null
    created_at: string | null
    internships: {
      title: string
      employers: { company_name: string } | null
    } | null
  }
  currentUserId: string
  currentUserName: string
}

export function StudentApplicationRow({ item, currentUserId, currentUserName }: Props) {
  const badge = STATUS_CONFIG[item.status ?? "pending"] ?? STATUS_CONFIG.pending
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : ""
  const companyName = item.internships?.employers?.company_name ?? "Работодатель"

  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-neutral-100 last:border-0 -mx-3 px-3 rounded-lg hover:bg-blue-50/30 transition-colors">
      <Link href={`/student/applications/${item.id}`} className="flex-1 min-w-0 group">
        <p className="font-heading font-bold text-[13px] truncate text-neutral-900 group-hover:text-blue-800 transition-colors">
          {item.internships?.title ?? "Место практики"}
        </p>
        <p className="text-[11px] text-neutral-400 mt-0.5">{date} · {companyName}</p>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-heading font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${badge.cls}`}>
          {badge.label}
        </span>
        <ApplicationChatDialog
          applicationId={item.id}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          otherUserName={companyName}
          triggerClassName="p-1.5 rounded-lg text-neutral-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
          triggerLabel=""
        />
      </div>
    </div>
  )
}
