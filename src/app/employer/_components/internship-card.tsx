"use client"

import { useState } from "react"
import { MapPin, Calendar, Users2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Database } from "@/types/supabase"

type Internship = Database["public"]["Tables"]["internships"]["Row"]

const FORMAT_LABEL: Record<string, string> = {
  internship: "Стажировка",
  traineeship: "Практика",
  production_practice: "Производственная",
}

export function InternshipCard({ item }: { item: Internship }) {
  const [open, setOpen] = useState(false)

  const format = item.format ? FORMAT_LABEL[item.format] : null
  const deadline = item.deadline
    ? new Date(item.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    : null

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group rounded-xl border border-neutral-200 bg-white p-5 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-heading font-bold text-[15px] leading-snug text-neutral-900">{item.title}</p>
          <span className={`shrink-0 text-[10px] font-heading font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${item.status === "active" ? "text-amber-600 border-amber-300 bg-amber-50" : "text-neutral-500 border-neutral-200 bg-neutral-50"}`}>
            {item.status === "active" ? "Активна" : "Закрыта"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {format && <span className="text-[11px] text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-md px-2 py-0.5">{format}</span>}
          {item.specialty && <span className="text-[11px] text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-md px-2 py-0.5">{item.specialty}</span>}
        </div>
        {item.description && <p className="text-xs text-neutral-500 leading-relaxed mb-3 line-clamp-2">{item.description}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400">
          {item.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.city}</span>}
          {deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{deadline}</span>}
          {item.places_count != null && <span className="flex items-center gap-1"><Users2 className="w-3 h-3" />{item.places_count} {item.places_count === 1 ? "место" : "мест"}</span>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 rounded-t-xl" />
          <DialogHeader className="pt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-heading font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${item.status === "active" ? "text-amber-600 border-amber-300 bg-amber-50" : "text-neutral-500 border-neutral-200 bg-neutral-50"}`}>
                {item.status === "active" ? "Активна" : "Закрыта"}
              </span>
            </div>
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
              {item.places_count != null && <span className="flex items-center gap-1.5"><Users2 className="w-3.5 h-3.5 text-neutral-400" />{item.places_count} {item.places_count === 1 ? "место" : "мест"}</span>}
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
