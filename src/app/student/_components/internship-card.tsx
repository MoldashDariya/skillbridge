"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  MapPin, Calendar, Users2, CheckCircle2, Send, Loader2, AlertCircle,
  BookOpen, ChevronDown, ChevronUp, Sparkles, XCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { notifyEmployerOnApplication } from "@/app/actions/notifications"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { analyzeSkillGap } from "@/app/student/_actions"
import type { Database } from "@/types/supabase"
import type { GapSkill, SkillGapResult } from "@/app/student/_actions"

type InternshipRow = Database["public"]["Tables"]["internships"]["Row"]
type CourseRow = { id: string; course_name: string; course_url: string }

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
  hasCollege: boolean
  hasPortfolio: boolean
  employerRating?: { avg: number; count: number } | null
}

type GapState = null | "loading" | SkillGapResult

export function InternshipCard({ item, alreadyApplied, studentId, hasCollege, hasPortfolio, employerRating }: Props) {
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState(alreadyApplied)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [courses, setCourses] = useState<CourseRow[] | null>(null)
  const [gapState, setGapState] = useState<GapState>(null)
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set())

  const router = useRouter()

  const format = item.format ? FORMAT_LABEL[item.format] : null
  const deadline = item.deadline
    ? new Date(item.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    : null

  // Fetch courses when dialog opens
  useEffect(() => {
    if (!open || courses !== null || !item.specialty) return
    createClient()
      .from("courses")
      .select("id, course_name, course_url")
      .ilike("specialty", `%${item.specialty}%`)
      .limit(2)
      .then(({ data }) => setCourses(data ?? []))
  }, [open, item.specialty, courses])

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

  async function handleAnalyze() {
    if (!studentId) return
    setGapState("loading")
    const result = await analyzeSkillGap(studentId, item.id)
    setGapState(result)
  }

  function toggleSkill(skill: string) {
    setExpandedSkills(prev => {
      const next = new Set(prev)
      next.has(skill) ? next.delete(skill) : next.add(skill)
      return next
    })
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group rounded-xl border border-neutral-200 bg-white p-5 hover:border-blue-400 hover:shadow-md hover:shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[11px] text-blue-700 font-heading font-bold tracking-widest uppercase">
            {item.employers?.company_name ?? "Работодатель"}
          </p>
          {employerRating && (
            <span className="text-[11px] text-neutral-500 flex items-center gap-0.5 shrink-0">
              <span className="text-amber-400">★</span>
              {employerRating.avg.toFixed(1)}
              <span className="text-neutral-400 ml-0.5">({employerRating.count})</span>
            </span>
          )}
        </div>
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
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[11px] text-blue-700 font-heading font-bold tracking-widest uppercase">
                {item.employers?.company_name ?? "Работодатель"}
              </p>
              {employerRating && (
                <span className="text-[11px] text-neutral-500 flex items-center gap-0.5 shrink-0">
                  <span className="text-amber-400">★</span>
                  {employerRating.avg.toFixed(1)}
                  <span className="text-neutral-400 ml-1">({employerRating.count} {employerRating.count === 1 ? "отзыв" : employerRating.count < 5 ? "отзыва" : "отзывов"})</span>
                </span>
              )}
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

            {/* Recommended courses */}
            {courses && courses.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-[11px] font-heading font-bold text-blue-700 tracking-[0.18em] uppercase mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" />
                  Рекомендованные курсы
                </p>
                <div className="space-y-2">
                  {courses.map(c => (
                    <a
                      key={c.id}
                      href={c.course_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[13px] text-blue-700 hover:text-blue-900 hover:underline underline-offset-2 transition-colors"
                    >
                      <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                      {c.course_name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI Skill Gap */}
            {studentId && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.18em] uppercase mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  Чего не хватает
                </p>

                {gapState === null && (
                  <button
                    onClick={handleAnalyze}
                    className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-heading font-bold tracking-widest uppercase rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Проверить пробелы в навыках
                  </button>
                )}

                {gapState === "loading" && (
                  <div className="flex items-center gap-2 text-[12px] text-neutral-400 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                    Анализируем ваш профиль...
                  </div>
                )}

                {gapState !== null && gapState !== "loading" && gapState.status === "no_portfolio" && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-700">
                      Заполните портфолио — это поможет AI персонализировать анализ пробелов в навыках.
                    </p>
                  </div>
                )}

                {gapState !== null && gapState !== "loading" && gapState.status === "error" && (
                  <div className="flex items-center gap-2 text-[12px] text-red-500">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    {gapState.message}
                  </div>
                )}

                {gapState !== null && gapState !== "loading" && gapState.status === "ok" && (
                  <div className="space-y-3">
                    {(gapState.gaps as GapSkill[]).map(gap => (
                      <div key={gap.skill} className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <span className="text-[13px] font-heading font-bold text-neutral-800">{gap.skill}</span>
                          <button
                            onClick={() => toggleSkill(gap.skill)}
                            className="flex items-center gap-1 text-[10px] font-heading font-bold tracking-widests uppercase text-violet-600 hover:text-violet-800 transition-colors shrink-0"
                          >
                            Как закрыть
                            {expandedSkills.has(gap.skill)
                              ? <ChevronUp className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />
                            }
                          </button>
                        </div>
                        {expandedSkills.has(gap.skill) && (
                          <div className="border-t border-neutral-100 px-3 py-2.5 bg-neutral-50 space-y-1.5">
                            {gap.plan.map((step, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-violet-100 text-violet-700 text-[9px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                <p className="text-[12px] text-neutral-600 leading-relaxed">{step}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-neutral-100 pt-4">
              {applied ? (
                <div className="flex items-center justify-center gap-2 py-3 text-[12px] font-heading font-bold tracking-widest uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Заявка подана
                </div>
              ) : studentId && !hasCollege ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-heading font-bold text-amber-700">Укажите колледж в профиле</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      Перед подачей заявки заполните раздел{" "}
                      <a href="/student/profile" className="underline underline-offset-2 font-bold">«Мой профиль»</a>
                      {" "}— выберите ваш колледж.
                    </p>
                  </div>
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
