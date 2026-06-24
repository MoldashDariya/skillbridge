"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Calendar, Users2, CheckCircle2, Send, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { notifyEmployerOnApplication } from "@/app/actions/notifications"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Database } from "@/types/supabase"

type InternshipRow = Database["public"]["Tables"]["internships"]["Row"]
export type InternshipWithEmployer = InternshipRow & {
  employers: { company_name: string } | null
}

const FORMAT_LABEL: Record<string, string> = {
  internship: "Стажировка",
  traineeship: "Практика",
  production_practice: "Производственная",
}

type Props = {
  item: InternshipWithEmployer
  alreadyApplied: boolean
  studentId: string | null
}

export function InternshipCard({ item, alreadyApplied, studentId }: Props) {
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState(alreadyApplied)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const format = item.format ? FORMAT_LABEL[item.format] : null
  const deadline = item.deadline
    ? new Date(item.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    : null

  async function handleApply() {
    if (!studentId) return
    setSubmitting(true)
    setError("")
    const supabase = createClient()
    const { error: err } = await supabase.from("applications").insert({
      internship_id: item.id,
      student_id: studentId,
      message: message.trim() || null,
    })
    if (err) {
      setError(err.code === "23505" ? "Вы уже подали заявку на эту практику" : err.message)
      setSubmitting(false)
      return
    }
    notifyEmployerOnApplication(item.id, studentId).catch(() => {})
    setApplied(true)
    setOpen(false)
    router.refresh()
    setSubmitting(false)
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group rounded-xl border border-neutral-200 bg-white p-5 hover:border-blue-400 hover:shadow-md hover:shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
      >
        <p className="text-[11px] text-blue-700 font-heading font-bold tracking-widest uppercase mb-1">
          {item.employers?.company_name ?? "Работодатель"}
        </p>
        <p className="font-heading font-bold text-[15px] leading-snug text-neutral-900 mb-3">{item.title}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {format && <span className="text-[11px] text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-md px-2 py-0.5">{format}</span>}
          {item.specialty && <span className="text-[11px] text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-md px-2 py-0.5">{item.specialty}</span>}
        </div>

        {item.description && (
          <p className="text-xs text-neutral-500 leading-relaxed mb-3 line-clamp-2">{item.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400 mb-auto pb-4">
          {item.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.city}</span>}
          {deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{deadline}</span>}
          {item.places_count != null && <span className="flex items-center gap-1"><Users2 className="w-3 h-3" />{item.places_count} мест</span>}
        </div>

        {applied ? (
          <div className="w-full h-9 flex items-center justify-center gap-1.5 text-[11px] font-heading font-bold tracking-widest uppercase text-emerald-600 border border-emerald-200 rounded-lg bg-emerald-50">
            <CheckCircle2 className="w-3.5 h-3.5" /> Заявка подана
          </div>
        ) : (
          <div className="w-full h-9 flex items-center justify-center text-[11px] font-heading font-bold tracking-widest uppercase text-neutral-400 border border-neutral-200 rounded-lg bg-neutral-50 group-hover:border-blue-300 group-hover:text-blue-700 group-hover:bg-blue-50/60 transition-all">
            Подробнее →
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 rounded-t-xl" />
          <DialogHeader className="pt-2">
            <p className="text-[11px] text-blue-700 font-heading font-bold tracking-widest uppercase mb-1">
              {item.employers?.company_name ?? "Работодатель"}
            </p>
            <DialogTitle className="font-heading font-extrabold text-[18px] leading-snug text-neutral-900">
              {item.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {format && <span className="text-[11px] text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-md px-2.5 py-1">{format}</span>}
              {item.specialty && <span className="text-[11px] text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-md px-2.5 py-1">{item.specialty}</span>}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-neutral-500">
              {item.city && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-neutral-400" />{item.city}</span>}
              {deadline && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-neutral-400" />до {deadline}</span>}
              {item.places_count != null && <span className="flex items-center gap-1.5"><Users2 className="w-3.5 h-3.5 text-neutral-400" />{item.places_count} мест</span>}
            </div>

            {item.description && (
              <div>
                <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-1.5">Описание</p>
                <p className="text-sm text-neutral-600 leading-relaxed">{item.description}</p>
              </div>
            )}

            {item.requirements && (
              <div>
                <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-1.5">Требования</p>
                <p className="text-sm text-neutral-600 leading-relaxed">{item.requirements}</p>
              </div>
            )}

            <div className="border-t border-neutral-100 pt-4">
              {applied ? (
                <div className="flex items-center justify-center gap-2 py-3 text-[12px] font-heading font-bold tracking-widest uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Заявка подана
                </div>
              ) : studentId ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase">
                    Сообщение <span className="font-normal normal-case tracking-normal">(необязательно)</span>
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md px-3 py-2 text-[14px] bg-neutral-50 border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 placeholder:text-neutral-400 transition-colors"
                    placeholder="Расскажите о себе и почему вас интересует эта практика..."
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button
                    onClick={handleApply}
                    disabled={submitting}
                    className="w-full h-10 flex items-center justify-center gap-2 text-[12px] font-heading font-bold tracking-widest uppercase text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-blue-600/25"
                  >
                    {submitting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Отправка...</>
                      : <><Send className="w-3.5 h-3.5" />Подать заявку</>}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
