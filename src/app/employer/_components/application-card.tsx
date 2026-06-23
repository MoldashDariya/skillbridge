"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MessageSquare, Check, X, Clock, UserRound, Briefcase } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { notifyStudentOnStatusChange } from "@/app/actions/notifications"
import { StudentPortfolioDialog } from "./student-portfolio-dialog"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",  cls: "text-amber-600 border-amber-300 bg-amber-50" },
  at_interview: { label: "На собеседовании", cls: "text-blue-600 border-blue-300 bg-blue-50" },
  accepted:     { label: "Принят",           cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Нанят",            cls: "text-emerald-700 border-emerald-400 bg-emerald-100" },
  rejected:     { label: "Отклонено",        cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

type Props = {
  id: string
  internshipTitle: string
  studentName: string
  studentId: string | null
  college: string | null
  specialty: string | null
  message: string | null
  status: string | null
  appliedAt: string | null
}

export function ApplicationCard({ id, internshipTitle, studentName, studentId, college, specialty, message, status: initialStatus, appliedAt }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const badge = STATUS_CONFIG[status ?? "pending"] ?? STATUS_CONFIG.pending
  const date = appliedAt ? new Date(appliedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : ""

  async function changeStatus(newStatus: string) {
    setLoading(newStatus)
    const supabase = createClient()
    const { error } = await supabase.from("applications").update({ status: newStatus }).eq("id", id)
    if (!error) {
      setStatus(newStatus)
      router.refresh()
      if (newStatus === "accepted" || newStatus === "rejected" || newStatus === "at_interview" || newStatus === "hired") {
        notifyStudentOnStatusChange(id, newStatus).catch(() => {})
      }
    }
    setLoading(null)
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 hover:border-amber-300 hover:shadow-sm transition-all">
      <p className="text-[11px] text-amber-600 font-heading font-bold tracking-widests uppercase mb-1">{internshipTitle}</p>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-heading font-bold text-[15px] leading-snug text-neutral-900">{studentName}</p>
          {(college || specialty) && (
            <p className="text-xs text-neutral-500 mt-0.5">{[college, specialty].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <span className={`shrink-0 text-[10px] font-heading font-bold tracking-widests uppercase px-2.5 py-1 rounded-full border ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {message && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 mb-4">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3 h-3 text-neutral-400" />
            <span className="text-[10px] text-neutral-400 font-heading tracking-widests uppercase">Сообщение</span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">{message}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-400">{date}</span>
          {studentId && <StudentPortfolioDialog studentId={studentId} studentName={studentName} />}
          <Link
            href={`/employer/applications/${id}`}
            className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all"
          >
            <MessageSquare className="w-3 h-3" />
            Написать
          </Link>
        </div>

        <div className="flex gap-1.5">
          {status === "pending" && (
            <>
              <button
                onClick={() => changeStatus("rejected")}
                disabled={loading !== null}
                className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-2.5 py-1.5 rounded-lg border border-red-200 text-red-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-40"
              >
                <X className="w-3 h-3" />
                {loading === "rejected" ? "..." : "Отклонить"}
              </button>
              <button
                onClick={() => changeStatus("at_interview")}
                disabled={loading !== null}
                className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-all disabled:opacity-40"
              >
                <UserRound className="w-3 h-3" />
                {loading === "at_interview" ? "..." : "Собеседование"}
              </button>
              <button
                onClick={() => changeStatus("accepted")}
                disabled={loading !== null}
                className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-400 transition-all disabled:opacity-40"
              >
                <Check className="w-3 h-3" />
                {loading === "accepted" ? "..." : "Принять"}
              </button>
            </>
          )}
          {status === "at_interview" && (
            <>
              <button
                onClick={() => changeStatus("rejected")}
                disabled={loading !== null}
                className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-2.5 py-1.5 rounded-lg border border-red-200 text-red-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-40"
              >
                <X className="w-3 h-3" />
                {loading === "rejected" ? "..." : "Отклонить"}
              </button>
              <button
                onClick={() => changeStatus("hired")}
                disabled={loading !== null}
                className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-2.5 py-1.5 rounded-lg bg-emerald-500 border border-emerald-500 text-white hover:bg-emerald-400 transition-all disabled:opacity-40 shadow-sm shadow-emerald-500/25"
              >
                <Briefcase className="w-3 h-3" />
                {loading === "hired" ? "..." : "Нанять"}
              </button>
            </>
          )}
          {(status === "accepted" || status === "hired" || status === "rejected") && (
            <button
              onClick={() => changeStatus("pending")}
              disabled={loading !== null}
              className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition-all disabled:opacity-40"
            >
              <Clock className="w-3 h-3" />
              {loading === "pending" ? "..." : "Изменить"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
