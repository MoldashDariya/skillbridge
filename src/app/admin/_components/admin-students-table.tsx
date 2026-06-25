"use client"

import { useState } from "react"
import { UserRound, GraduationCap, Briefcase } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog"

const APP_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",       cls: "text-blue-700 border-blue-300 bg-blue-50" },
  at_interview: { label: "На собеседовании",       cls: "text-blue-600 border-blue-300 bg-blue-50" },
  interviewing: { label: "Проходит собеседование", cls: "text-violet-600 border-violet-300 bg-violet-50" },
  accepted:     { label: "Принят",                 cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Нанят",                  cls: "text-emerald-700 border-emerald-400 bg-emerald-100" },
  rejected:     { label: "Отклонено",              cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

const CURRENT_STATUS_CONFIG = {
  accepted:     { label: "Принят",                 cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  interviewing: { label: "На собеседовании",        cls: "text-blue-600 border-blue-300 bg-blue-50" },
  searching:    { label: "Ищет практику",           cls: "text-neutral-400 border-neutral-200 bg-neutral-50" },
} as const

export type StudentTableRow = {
  id: string
  name: string
  specialty: string | null
  courseYear: number | null
  bio: string | null
  skills: string[] | null
  photoUrl: string | null
  hasPortfolio: boolean
  currentStatus: "accepted" | "interviewing" | "searching"
  applications: {
    id: string
    status: string | null
    createdAt: string | null
    internshipTitle: string
    companyName: string
  }[]
}

export function AdminStudentsTable({ rows }: { rows: StudentTableRow[] }) {
  const [selected, setSelected] = useState<StudentTableRow | null>(null)

  return (
    <>
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-100 bg-neutral-50/60 hover:bg-neutral-50/60">
              <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Студент</TableHead>
              <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Специальность</TableHead>
              <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Курс</TableHead>
              <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Портфолио</TableHead>
              <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Текущий статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const cs = CURRENT_STATUS_CONFIG[row.currentStatus]
              return (
                <TableRow
                  key={row.id}
                  className="border-neutral-100 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(row)}
                >
                  <TableCell>
                    <span className="font-heading font-bold text-[13px] text-neutral-900">
                      {row.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-[13px] text-neutral-500">{row.specialty ?? "—"}</TableCell>
                  <TableCell className="text-[13px] text-neutral-500">{row.courseYear ?? "—"}</TableCell>
                  <TableCell>
                    {row.hasPortfolio ? (
                      <span className="text-[10px] font-heading font-bold tracking-widests uppercase text-emerald-600 border border-emerald-300 bg-emerald-50 px-2 py-0.5 rounded-full">Есть</span>
                    ) : (
                      <span className="text-[10px] font-heading font-bold tracking-widests uppercase text-neutral-400 border border-neutral-200 bg-neutral-50 px-2 py-0.5 rounded-full">Нет</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-heading font-bold tracking-widests uppercase px-2 py-0.5 rounded-full border ${cs.cls}`}>
                      {cs.label}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                {selected.photoUrl ? (
                  <img
                    src={selected.photoUrl}
                    alt={selected.name}
                    className="w-14 h-14 rounded-xl object-cover border border-neutral-200 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center shrink-0">
                    <UserRound className="w-5 h-5 text-neutral-300" />
                  </div>
                )}
                <div>
                  <DialogTitle className="font-heading font-extrabold text-[17px] text-neutral-900 leading-tight">
                    {selected.name}
                  </DialogTitle>
                  {(selected.specialty || selected.courseYear) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.18em] uppercase">
                        {[selected.specialty, selected.courseYear ? `${selected.courseYear} курс` : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5 pt-1">
                {selected.bio && (
                  <div>
                    <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-1.5">О себе</p>
                    <p className="text-sm text-neutral-600 leading-relaxed">{selected.bio}</p>
                  </div>
                )}

                {selected.skills && selected.skills.length > 0 && (
                  <div>
                    <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-1.5">Навыки</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.skills.map((skill) => (
                        <span key={skill} className="text-[11px] font-heading font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                    <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase">
                      История заявок
                      {selected.applications.length > 0 && ` — ${selected.applications.length}`}
                    </p>
                  </div>
                  {selected.applications.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center">
                      <p className="text-sm text-neutral-400">Заявок нет</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selected.applications.map((app) => {
                        const badge = APP_STATUS_CONFIG[app.status ?? "pending"] ?? APP_STATUS_CONFIG.pending
                        const date = app.createdAt
                          ? new Date(app.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
                          : "—"
                        return (
                          <div key={app.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-heading font-bold text-neutral-800 truncate">{app.internshipTitle}</p>
                              <p className="text-[11px] text-neutral-400">{app.companyName} · {date}</p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-heading font-bold tracking-widests uppercase px-2 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
