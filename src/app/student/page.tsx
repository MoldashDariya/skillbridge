import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BookOpen, Briefcase, LayoutGrid, FileText, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { InternshipCard } from "./_components/internship-card"
import { StudentApplicationRow } from "./_components/application-row"
import { ConnectTelegramButton } from "@/components/connect-telegram-button"
import { calculateProfileReadiness } from "@/lib/profile-readiness"
import type { Database } from "@/types/supabase"

export const metadata = { title: "Кабинет студента — SkillBridge KZ" }

type InternshipRow = Database["public"]["Tables"]["internships"]["Row"]
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"]

type InternshipWithEmployer = InternshipRow & {
  employers: { company_name: string } | null
}
type ApplicationWithInternship = ApplicationRow & {
  internships: { title: string; employers: { company_name: string } | null } | null
}

const SECTIONS = [
  { icon: BookOpen, title: "Мой профиль", desc: "Укажите колледж, специальность и навыки", href: "/student/profile" },
  { icon: LayoutGrid, title: "Портфолио", desc: "Загрузите фотографии ваших работ", href: "/student/profile" },
  { icon: Briefcase, title: "Места практики", desc: "Найдите подходящее место и подайте заявку", href: "#internships" },
]

export default async function StudentDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, phone, photo_url, approval_status, telegram_chat_id")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/auth")
  if (profile.role === "employer") redirect("/employer")
  if (profile.role === "college_admin") redirect("/admin")

  const { data: student } = await supabase
    .from("students")
    .select("id, college_name, specialty, course_year")
    .eq("user_id", user.id)
    .single()

  const { data: internshipsRaw } = await supabase
    .from("internships")
    .select("*, employers(company_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const internships = (internshipsRaw ?? []) as InternshipWithEmployer[]

  const { data: applicationsRaw } = student
    ? await supabase
        .from("applications")
        .select("*, internships(title, employers(company_name))")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
    : { data: [] as ApplicationWithInternship[] }

  const applications = (applicationsRaw ?? []) as ApplicationWithInternship[]
  const appliedIds = new Set(applications.map((a) => a.internship_id))

  // Readiness data
  const [portfolioCountRes, certCountRes] = student
    ? await Promise.all([
        supabase.from("portfolio_items").select("*", { count: "exact", head: true }).eq("student_id", student.id),
        supabase.from("student_certificates").select("*", { count: "exact", head: true }).eq("student_id", student.id),
      ])
    : [{ count: 0 }, { count: 0 }]

  const hasBasicFields = !!(
    profile.first_name && profile.last_name && profile.phone &&
    student?.college_name && student?.specialty && student?.course_year
  )
  const readiness = calculateProfileReadiness({
    photoUrl: profile.photo_url,
    hasPortfolio: (portfolioCountRes.count ?? 0) > 0,
    hasCertificates: (certCountRes.count ?? 0) > 0,
    isApproved: profile.approval_status === "approved",
    hasBasicFields,
  })

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth")
  }

  const name =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30">
              <span className="text-white text-[10px] font-heading font-bold">SK</span>
            </div>
            <span className="text-sm font-heading font-bold tracking-wide text-neutral-900">SkillBridge KZ</span>
            <span className="text-neutral-300 text-xs mx-1">·</span>
            <span className="text-xs text-neutral-400 tracking-widest uppercase">Студент</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors tracking-widest uppercase font-heading"
            >
              Выйти
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12 stagger-1 relative pl-4">
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-full" />
          <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase mb-2">
            Личный кабинет
          </p>
          <h1 className="text-3xl font-heading font-extrabold leading-tight text-neutral-900">
            {name ?? "Добро пожаловать"}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">{user.email}</p>
          {profile && (
            <div className="mt-3">
              <ConnectTelegramButton profileId={profile.id} connected={!!profile.telegram_chat_id} />
            </div>
          )}
        </div>

        {/* Career Readiness */}
        <section className="mb-8 stagger-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="relative pl-4">
                <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-600 rounded-full" />
                <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
                  Карьерная готовность
                </p>
              </div>
              <span className={`text-[11px] font-heading font-bold tracking-widests uppercase px-3 py-1 rounded-full border ${readiness.labelCls}`}>
                {readiness.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-7 h-2 rounded-full transition-colors ${
                      i < readiness.score
                        ? readiness.level === "high" ? "bg-emerald-500"
                          : readiness.level === "medium" ? "bg-amber-400"
                          : "bg-neutral-300"
                        : "bg-neutral-100"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-neutral-400 font-heading tabular-nums">{readiness.score}/5</span>
            </div>

            {readiness.missing.length === 0 ? (
              <p className="text-xs text-emerald-600 font-heading font-bold tracking-widests uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Профиль полностью заполнен
              </p>
            ) : (
              <div className="space-y-1.5">
                {readiness.missing.map(hint => (
                  <div key={hint} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-200 shrink-0" />
                    <p className="text-xs text-neutral-500">{hint}</p>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/student/profile"
              className="inline-block mt-3 text-[11px] font-heading font-bold tracking-widests text-blue-600 hover:text-blue-800 uppercase transition-colors"
            >
              Заполнить профиль →
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
          {SECTIONS.map(({ icon: Icon, title, desc, href }, i) => (
            <Link
              key={title}
              href={href}
              className={`group rounded-xl border border-neutral-200 bg-white p-6 hover:border-blue-400 hover:shadow-md hover:shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-200 stagger-${i + 2}`}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <p className="font-heading font-bold text-[15px] mb-1 text-neutral-900">{title}</p>
              <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>

        {/* Доступные практики */}
        <div className="mb-12 stagger-5">
          <div className="flex items-center justify-between mb-5">
            <div className="relative pl-4">
              <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
              <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
                Доступные практики
              </p>
              {internships.length > 0 && (
                <p className="text-xs text-neutral-400 mt-0.5">{internships.length} открытых позиций</p>
              )}
            </div>
          </div>

          {internships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <p className="font-heading font-bold text-[15px] mb-1 text-neutral-500">Пока нет открытых практик</p>
              <p className="text-xs text-neutral-400">Работодатели ещё не добавили места практики</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {internships.map((item) => (
                <InternshipCard
                  key={item.id}
                  item={item}
                  alreadyApplied={appliedIds.has(item.id)}
                  studentId={student?.id ?? null}
                  hasCollege={!!(student as { college_name?: string | null } | null)?.college_name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Мои заявки */}
        <div className="stagger-6">
          <div className="relative pl-4 mb-5">
            <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
            <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
              Мои заявки
            </p>
            {applications.length > 0 && (
              <p className="text-xs text-neutral-400 mt-0.5">
                {applications.length}{" "}
                {applications.length === 1 ? "заявка" : applications.length < 5 ? "заявки" : "заявок"}
              </p>
            )}
          </div>

          {applications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
              <p className="text-sm text-neutral-400">Вы ещё не подавали заявки</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white px-5 shadow-sm">
              {applications.map((item) => (
                <StudentApplicationRow
                  key={item.id}
                  item={item}
                  currentUserId={user.id}
                  currentUserName={name ?? user.email ?? "Студент"}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
