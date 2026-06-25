"use client"

import { useState } from "react"
import { Eye, Loader2, ImageOff, X, ChevronLeft, ChevronRight, Video, GraduationCap, Briefcase, UserRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type PortfolioItem = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  video_url: string | null
}

type StudentData = {
  bio: string | null
  skills: string[] | null
  college_name: string | null
  specialty: string | null
}

type ApplicationItem = {
  id: string
  status: string | null
  internships: { title: string; employers: { company_name: string } | null } | null
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",       cls: "text-blue-700 border-blue-300 bg-blue-50" },
  at_interview: { label: "На собеседовании",       cls: "text-blue-600 border-blue-300 bg-blue-50" },
  interviewing: { label: "Проходит собеседование", cls: "text-violet-600 border-violet-300 bg-violet-50" },
  accepted:     { label: "Принят",                 cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Принят",                  cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  rejected:     { label: "Отклонено",              cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

type Props = {
  studentId: string
  studentName: string
  studentPhotoUrl?: string | null
}

function isVideoItem(item: PortfolioItem) {
  return !!item.video_url && !item.image_url
}

export function StudentPortfolioDialog({ studentId, studentName, studentPhotoUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PortfolioItem[] | null>(null)
  const [student, setStudent] = useState<StudentData | null>(null)
  const [applications, setApplications] = useState<ApplicationItem[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen && items === null) {
      setLoading(true)
      const supabase = createClient()
      const [portfolioRes, studentRes, appRes] = await Promise.all([
        supabase
          .from("portfolio_items")
          .select("id, title, description, image_url, video_url")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase.from("students").select("bio, skills, college_name, specialty").eq("id", studentId).single(),
        supabase
          .from("applications")
          .select("id, status, internships(title, employers(company_name))")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
      ])
      setItems(portfolioRes.data ?? [])
      setStudent(studentRes.data ?? null)
      setApplications(appRes.data as ApplicationItem[] ?? [])
      setLoading(false)
    }
  }

  const photoItems = (items ?? []).filter(i => !isVideoItem(i))
  const videoItems = (items ?? []).filter(i => isVideoItem(i))

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-[11px] font-heading font-bold tracking-widests uppercase px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition-all">
          <Eye className="w-3 h-3" />
          Профиль
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Verification photo — shown immediately, available from parent server query */}
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          {studentPhotoUrl ? (
            <img
              src={studentPhotoUrl}
              alt={studentName}
              className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center shrink-0">
              <UserRound className="w-6 h-6 text-neutral-300" />
            </div>
          )}
          <div>
            <DialogTitle className="font-heading font-extrabold text-[17px] text-neutral-900 leading-tight">
              {studentName}
            </DialogTitle>
            {student?.college_name ? (
              <div className="flex items-center gap-1.5 mt-1">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.18em] uppercase">
                  {[student.college_name, student.specialty].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400 mt-0.5">{studentPhotoUrl ? "Фото верифицировано" : "Фото не загружено"}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Bio */}
            {student?.bio && (
              <div>
                <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-2">О себе</p>
                <p className="text-sm text-neutral-600 leading-relaxed">{student.bio}</p>
              </div>
            )}

            {/* Skills */}
            {student?.skills && student.skills.length > 0 && (
              <div>
                <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-2">Навыки</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.skills.map((skill) => (
                    <span key={skill} className="text-[11px] font-heading font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Applications */}
            {applications && applications.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                  <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase">
                    Отклики — {applications.length}
                  </p>
                </div>
                <div className="space-y-2">
                  {applications.map((app) => {
                    const badge = STATUS_CONFIG[app.status ?? "pending"] ?? STATUS_CONFIG.pending
                    return (
                      <div key={app.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-heading font-bold text-neutral-800 truncate">{app.internships?.title ?? "—"}</p>
                          <p className="text-[11px] text-neutral-400">{app.internships?.employers?.company_name ?? "—"}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-heading font-bold tracking-widests uppercase px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Photo works */}
            <div>
              <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-2">
                Фото работы
                {photoItems.length > 0 && <span className="ml-1.5 font-normal normal-case tracking-normal">— {photoItems.length}</span>}
              </p>
              {photoItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                  <p className="text-sm text-neutral-400">Фото не загружено</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photoItems.map((item) => {
                    const globalIdx = (items ?? []).findIndex(i => i.id === item.id)
                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-white aspect-square cursor-zoom-in"
                        onClick={() => setLightboxIndex(globalIdx)}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-50">
                            <ImageOff className="w-6 h-6 text-neutral-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start justify-end p-3 pointer-events-none">
                          <p className="text-white text-xs font-heading font-bold truncate w-full">{item.title}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Video works */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Video className="w-3.5 h-3.5 text-neutral-400" />
                <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase">
                  Видео работы
                  {videoItems.length > 0 && <span className="ml-1.5 font-normal normal-case tracking-normal">— {videoItems.length}</span>}
                </p>
              </div>
              {videoItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                  <p className="text-sm text-neutral-400">Видео не загружено</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videoItems.map((item) => (
                    <div key={item.id} className="rounded-xl overflow-hidden border border-neutral-200 bg-black aspect-video">
                      <video
                        src={item.video_url ?? ""}
                        className="w-full h-full object-contain"
                        controls
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Lightbox for photos */}
      {lightboxIndex !== null && items && items[lightboxIndex] && !isVideoItem(items[lightboxIndex]) && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          {items.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i - 1 + items.length) % items.length : null) }}
                className="absolute left-4 text-white/70 hover:text-white p-2"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i + 1) % items.length : null) }}
                className="absolute right-4 text-white/70 hover:text-white p-2"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}
          <div className="max-w-3xl max-h-[90vh] px-16 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={items[lightboxIndex].image_url ?? ""}
              alt={items[lightboxIndex].title}
              className="max-h-[75vh] max-w-full object-contain rounded-lg"
            />
            <div className="text-center">
              <p className="text-white font-heading font-bold text-sm">{items[lightboxIndex].title}</p>
              {items[lightboxIndex].description && (
                <p className="text-white/60 text-xs mt-1">{items[lightboxIndex].description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}
