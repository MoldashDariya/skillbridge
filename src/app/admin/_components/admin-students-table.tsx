"use client"

import { useState, useEffect, useTransition } from "react"
import { UserRound, GraduationCap, Briefcase, BadgeCheck, FileText, ExternalLink, BarChart2, Loader2 } from "lucide-react"
import { updateStudentPassport } from "../_actions"
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
  hired:        { label: "Принят",                  cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
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
  gpa: number | null
  gpaVerified: boolean
  attendancePercent: number | null
  links: { github: string | null; linkedin: string | null; behance: string | null; dribbble: string | null; figma: string | null }
  certificates: { id: string; file_url: string; title: string | null }[]
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
  const [gpaVerified, setGpaVerified] = useState(false)
  const [attendanceInput, setAttendanceInput] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (selected) {
      setGpaVerified(selected.gpaVerified)
      setAttendanceInput(selected.attendancePercent?.toString() ?? "")
    }
  }, [selected])

  function handleToggleGpa(checked: boolean) {
    if (!selected) return
    setGpaVerified(checked)
    startTransition(() => updateStudentPassport(selected.id, { gpa_verified: checked }))
  }

  function handleSaveAttendance() {
    if (!selected) return
    const val = attendanceInput.trim() !== "" ? parseInt(attendanceInput, 10) : null
    if (val !== null && (isNaN(val) || val < 0 || val > 100)) return
    startTransition(() => updateStudentPassport(selected.id, { attendance_percent: val }))
  }

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

                {/* Passport — admin editable */}
                <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 space-y-4">
                  <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase">Паспорт студента</p>

                  {/* GPA + verified toggle */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase mb-1">GPA</p>
                      <p className="text-[18px] font-bold tabular-nums text-neutral-900 leading-none">
                        {selected.gpa ?? <span className="text-neutral-300 text-sm">—</span>}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => handleToggleGpa(!gpaVerified)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${gpaVerified ? "bg-emerald-500" : "bg-neutral-200"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${gpaVerified ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs text-neutral-600 font-heading font-bold flex items-center gap-1">
                        {gpaVerified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />}
                        {gpaVerified ? "Верифицирован" : "Не верифицирован"}
                      </span>
                      {isPending && <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />}
                    </label>
                  </div>

                  {/* Attendance */}
                  <div>
                    <p className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase mb-1.5 flex items-center gap-1.5">
                      <BarChart2 className="w-3 h-3" />
                      Посещаемость (%)
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={attendanceInput}
                        onChange={e => setAttendanceInput(e.target.value)}
                        onBlur={handleSaveAttendance}
                        placeholder="0–100"
                        className="h-8 w-24 px-2.5 rounded-md border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:border-blue-400 transition-colors"
                      />
                      {attendanceInput && <span className="text-xs text-neutral-400">Сохранится при потере фокуса</span>}
                    </div>
                  </div>

                  {/* Links */}
                  {Object.values(selected.links).some(Boolean) && (
                    <div>
                      <p className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase mb-1.5">Ссылки</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { url: selected.links.github,   label: "GitHub" },
                          { url: selected.links.linkedin,  label: "LinkedIn" },
                          { url: selected.links.behance,   label: "Behance" },
                          { url: selected.links.dribbble,  label: "Dribbble" },
                          { url: selected.links.figma,     label: "Figma" },
                        ].filter(l => l.url).map(({ url, label }) => (
                          <a
                            key={label}
                            href={url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-2 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certificates */}
                  {selected.certificates.length > 0 && (
                    <div>
                      <p className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase mb-1.5">Сертификаты</p>
                      <div className="space-y-1">
                        {selected.certificates.map(cert => (
                          <a
                            key={cert.id}
                            href={cert.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[12px] text-neutral-600 hover:text-blue-700 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            {cert.title ?? "Сертификат"}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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
