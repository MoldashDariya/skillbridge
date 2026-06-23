import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ArrowLeft, GraduationCap, Briefcase, ImageOff, Video, MessageSquare } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",  cls: "text-amber-600 border-amber-300 bg-amber-50" },
  at_interview: { label: "На собеседовании", cls: "text-blue-600 border-blue-300 bg-blue-50" },
  accepted:     { label: "Принят",           cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Нанят",            cls: "text-emerald-700 border-emerald-400 bg-emerald-100" },
  rejected:     { label: "Отклонено",        cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

export default async function AdminStudentView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: adminProfile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single()
  if (adminProfile?.role !== "college_admin") redirect("/auth")

  const { data: adminRow } = await supabase
    .from("college_admins").select("college_name").eq("user_id", user.id).single()
  const collegeName = adminRow?.college_name ?? ""

  const adminClient = createAdminClient()

  const { data: student } = await adminClient
    .from("students")
    .select("id, user_id, college_name, specialty, course_year, bio, skills")
    .eq("id", id)
    .single()

  if (!student) notFound()
  // Scope check — admin can only view students from their college
  if (student.college_name !== collegeName) notFound()

  const [profileRes, portfolioRes, applicationsRes] = await Promise.all([
    adminClient.from("profiles").select("first_name, last_name, photo_url").eq("user_id", student.user_id).single(),
    adminClient.from("portfolio_items")
      .select("id, title, description, image_url, video_url")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    adminClient.from("applications")
      .select("id, status, created_at, internships(title, employers(company_name))")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
  ])

  const profile = profileRes.data
  const portfolioItems = portfolioRes.data ?? []
  const applications = (applicationsRes.data ?? []) as {
    id: string
    status: string | null
    created_at: string | null
    internships: { title: string; employers: { company_name: string } | null } | null
  }[]

  const studentName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Студент"
    : "Студент"

  const photoItems = portfolioItems.filter(i => !i.video_url || i.image_url)
  const videoItems = portfolioItems.filter(i => i.video_url && !i.image_url)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-neutral-400 hover:text-neutral-700 transition-colors p-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-4 bg-neutral-200" />
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm shadow-amber-500/30">
              <span className="text-white text-[10px] font-heading font-bold">SK</span>
            </div>
            <span className="text-sm font-heading font-bold tracking-wide text-neutral-900">SkillBridge KZ</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Student header */}
        <div className="flex items-start gap-5">
          {profile?.photo_url ? (
            <img
              src={profile.photo_url}
              alt={studentName}
              className="w-16 h-16 rounded-2xl object-cover border border-neutral-200 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7 text-amber-400" />
            </div>
          )}
          <div className="relative pl-4">
            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-amber-500 rounded-full" />
            <p className="text-[11px] font-heading font-bold text-amber-500 tracking-[0.2em] uppercase mb-1">Профиль студента</p>
            <h1 className="text-2xl font-heading font-extrabold text-neutral-900">{studentName}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {student.college_name && (
                <span className="text-[11px] font-heading font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                  {student.college_name}
                </span>
              )}
              {student.specialty && (
                <span className="text-[11px] text-neutral-500">{student.specialty}</span>
              )}
              {student.course_year && (
                <span className="text-[11px] text-neutral-400">{student.course_year} курс</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio + skills */}
        {(student.bio || (student.skills && student.skills.length > 0)) && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            {student.bio && (
              <div>
                <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-2">О себе</p>
                <p className="text-sm text-neutral-600 leading-relaxed">{student.bio}</p>
              </div>
            )}
            {student.skills && student.skills.length > 0 && (
              <div>
                <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-2">Навыки</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.skills.map((skill: string) => (
                    <span key={skill} className="text-[11px] font-heading font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Applications */}
        <section>
          <div className="relative pl-4 mb-4">
            <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-amber-400 rounded-full" />
            <div className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
              <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
                Отклики
                <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">— {applications.length}</span>
              </p>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-6 text-center">
              <p className="text-sm text-neutral-400">Заявок пока нет</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm divide-y divide-neutral-100">
              {applications.map((app) => {
                const badge = STATUS_CONFIG[app.status ?? "pending"] ?? STATUS_CONFIG.pending
                const date = app.created_at
                  ? new Date(app.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                  : "—"
                return (
                  <div key={app.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-[13px] text-neutral-900 truncate">
                        {app.internships?.title ?? "Место практики"}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {app.internships?.employers?.company_name ?? "—"} · {date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-heading font-bold tracking-widests uppercase px-2 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="flex items-center gap-1 text-[10px] font-heading font-bold tracking-widests uppercase text-neutral-400 hover:text-amber-600 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Переписка
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Photo portfolio */}
        <section>
          <div className="relative pl-4 mb-4">
            <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-amber-400 rounded-full" />
            <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
              Фото работы
              {photoItems.length > 0 && <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">— {photoItems.length}</span>}
            </p>
          </div>
          {photoItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center">
              <ImageOff className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">Фото не загружено</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photoItems.map((item) => (
                <a
                  key={item.id}
                  href={item.image_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-white aspect-square"
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-50">
                      <ImageOff className="w-6 h-6 text-neutral-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 pointer-events-none">
                    <p className="text-white text-xs font-heading font-bold truncate w-full">{item.title}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Video portfolio */}
        <section>
          <div className="relative pl-4 mb-4">
            <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-amber-400 rounded-full" />
            <div className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-neutral-400" />
              <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
                Видео работы
                {videoItems.length > 0 && <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">— {videoItems.length}</span>}
              </p>
            </div>
          </div>
          {videoItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center">
              <p className="text-sm text-neutral-400">Видео не загружено</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videoItems.map((item) => (
                <div key={item.id} className="rounded-xl overflow-hidden border border-neutral-200 bg-black">
                  <video
                    src={item.video_url ?? ""}
                    className="w-full aspect-video object-contain"
                    controls
                  />
                  {item.title && (
                    <p className="text-xs text-neutral-400 font-heading font-bold px-3 py-2 bg-white truncate">{item.title}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
