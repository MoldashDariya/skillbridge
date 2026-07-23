import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GraduationCap, Briefcase, CheckCircle2, ImageIcon, UserCheck, Building2, FileText, ExternalLink, MessageSquare } from "lucide-react"
import Link from "next/link"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { approveUser, rejectUser } from "./_actions"
import { AdminStudentsTable, type StudentTableRow } from "./_components/admin-students-table"
import { CsvRosterUpload } from "./_components/csv-roster-upload"

export const dynamic = "force-dynamic"
export const metadata = { title: "Кабинет администратора — SkillBridge KZ" }

const APP_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",       cls: "text-blue-700 border-blue-300 bg-blue-50" },
  at_interview: { label: "На собеседовании",       cls: "text-blue-600 border-blue-300 bg-blue-50" },
  interviewing: { label: "Проходит собеседование", cls: "text-violet-600 border-violet-300 bg-violet-50" },
  accepted:     { label: "Принят",                 cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Принят",                  cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  rejected:     { label: "Отклонено",              cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

type ApplicationRow = {
  id: string
  status: string | null
  created_at: string | null
  student_id: string
  internships: { title: string; employers: { company_name: string } | null } | null
}

type PendingProfile = {
  user_id: string
  role: string
  first_name: string | null
  last_name: string | null
  created_at: string | null
  photo_url: string | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles").select("role, approval_status").eq("user_id", user.id).single()
  if (!profile) redirect("/auth")
  if (profile.role === "student") redirect("/student")
  if (profile.role === "employer") redirect("/employer")

  const { data: admin } = await supabase
    .from("college_admins").select("college_name").eq("user_id", user.id).single()
  const collegeName = admin?.college_name ?? "Колледж"

  // Use service-role client to read pending users (bypasses RLS)
  const adminClient = createAdminClient()

  // Pending approvals
  const { data: pendingRaw } = await adminClient
    .from("profiles")
    .select("user_id, role, first_name, last_name, created_at, photo_url")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true })

  const pendingProfiles = (pendingRaw ?? []) as PendingProfile[]

  const pendingEmployerIds = pendingProfiles.filter(p => p.role === "employer").map(p => p.user_id)
  const pendingStudentIds  = pendingProfiles.filter(p => p.role === "student").map(p => p.user_id)

  const [{ data: pendingEmployerData }, { data: pendingStudentData }] = await Promise.all([
    pendingEmployerIds.length > 0
      ? adminClient.from("employers").select("user_id, company_name, document_urls").in("user_id", pendingEmployerIds)
      : Promise.resolve({ data: [] as { user_id: string; company_name: string; document_urls: string[] | null }[] }),
    pendingStudentIds.length > 0
      ? adminClient.from("students").select("user_id, college_name, specialty").in("user_id", pendingStudentIds)
      : Promise.resolve({ data: [] as { user_id: string; college_name: string | null; specialty: string | null }[] }),
  ])

  const employerMap = new Map((pendingEmployerData ?? []).map(e => [e.user_id, e]))
  const studentMap2 = new Map((pendingStudentData ?? []).map(s => [s.user_id, s]))

  // Students from this college
  const { data: studentsRaw } = await supabase
    .from("students")
    .select("id, user_id, specialty, course_year, bio, skills, gpa, gpa_verified, attendance_percent, github_url, linkedin_url, behance_url, dribbble_url, figma_url")
    .eq("college_name", collegeName)

  const students = studentsRaw ?? []
  const studentIds   = students.map(s => s.id)
  const studentUserIds = students.map(s => s.user_id)

  type ProfileRow   = { user_id: string; first_name: string | null; last_name: string | null; photo_url: string | null }
  type PortfolioRow = { student_id: string }
  type CertRow      = { id: string; student_id: string; file_url: string; title: string | null }

  const [profilesResult, portfolioResult, applicationsResult, certificatesResult] = await Promise.all([
    studentUserIds.length > 0
      ? supabase.from("profiles").select("user_id, first_name, last_name, photo_url").in("user_id", studentUserIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    studentIds.length > 0
      ? supabase.from("portfolio_items").select("student_id").in("student_id", studentIds)
      : Promise.resolve({ data: [] as PortfolioRow[] }),
    studentIds.length > 0
      ? supabase.from("applications")
          .select("id, status, created_at, student_id, internships(title, employers(company_name))")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as ApplicationRow[] }),
    studentIds.length > 0
      ? supabase.from("student_certificates")
          .select("id, student_id, file_url, title")
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] as CertRow[] }),
  ])

  const profileMap = new Map((profilesResult.data ?? []).map(p => [p.user_id, p as ProfileRow]))
  const portfolioStudentIds = new Set((portfolioResult.data ?? []).map(p => (p as PortfolioRow).student_id))
  const applications = (applicationsResult.data ?? []) as ApplicationRow[]
  const studentMap   = new Map(students.map(s => [s.id, s]))

  const certsByStudent = new Map<string, CertRow[]>()
  for (const cert of (certificatesResult.data ?? []) as CertRow[]) {
    const list = certsByStudent.get(cert.student_id) ?? []
    list.push(cert)
    certsByStudent.set(cert.student_id, list)
  }

  const totalStudents          = students.length
  const studentsWithPortfolio  = students.filter(s => portfolioStudentIds.has(s.id)).length
  const totalApplications      = applications.length
  const acceptedApplications   = applications.filter(a => a.status === "accepted" || a.status === "hired").length

  // Per-student application list for the profile dialog
  const studentAppsMap = new Map<string, ApplicationRow[]>()
  for (const app of applications) {
    const list = studentAppsMap.get(app.student_id) ?? []
    list.push(app)
    studentAppsMap.set(app.student_id, list)
  }

  // Fetch college roster for verification badges
  const { data: rosterRaw } = await supabase
    .from("official_college_roster")
    .select("full_name")
    .eq("college_name", collegeName)

  function normalizeName(s: string) {
    return s.toLowerCase().trim().replace(/\s+/g, " ").split(" ").sort().join(" ")
  }
  const rosterNames = (rosterRaw ?? []).map(r => normalizeName(r.full_name))

  const studentRows: StudentTableRow[] = students.map((student) => {
    const prof = profileMap.get(student.user_id)
    const name = prof ? `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim() || "—" : "—"
    const apps = studentAppsMap.get(student.id) ?? []
    const statuses = new Set(apps.map(a => a.status))
    let currentStatus: StudentTableRow["currentStatus"] = "searching"
    if (statuses.has("accepted") || statuses.has("hired")) currentStatus = "accepted"
    else if (statuses.has("interviewing") || statuses.has("at_interview")) currentStatus = "interviewing"
    const s = student as {
      course_year?: number | null; bio?: string | null; skills?: string[] | null
      gpa?: number | null; gpa_verified?: boolean; attendance_percent?: number | null
      github_url?: string | null; linkedin_url?: string | null; behance_url?: string | null
      dribbble_url?: string | null; figma_url?: string | null
    }
    return {
      id: student.id,
      name,
      specialty: student.specialty ?? null,
      courseYear: s.course_year ?? null,
      bio: s.bio ?? null,
      skills: s.skills ?? null,
      photoUrl: prof?.photo_url ?? null,
      hasPortfolio: portfolioStudentIds.has(student.id),
      currentStatus,
      gpa: s.gpa ?? null,
      gpaVerified: s.gpa_verified ?? false,
      attendancePercent: s.attendance_percent ?? null,
      links: {
        github:   s.github_url   ?? null,
        linkedin: s.linkedin_url ?? null,
        behance:  s.behance_url  ?? null,
        dribbble: s.dribbble_url ?? null,
        figma:    s.figma_url    ?? null,
      },
      certificates: (certsByStudent.get(student.id) ?? []).map(c => ({
        id: c.id, file_url: c.file_url, title: c.title,
      })),
      applications: apps.map(app => ({
        id: app.id,
        status: app.status,
        createdAt: app.created_at,
        internshipTitle: app.internships?.title ?? "—",
        companyName: app.internships?.employers?.company_name ?? "—",
      })),
    }
  })

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth")
  }

  const METRICS = [
    { icon: GraduationCap, label: "Студентов",     value: totalStudents,        emerald: false },
    { icon: ImageIcon,     label: "С портфолио",   value: studentsWithPortfolio, emerald: false },
    { icon: Briefcase,     label: "Заявок подано", value: totalApplications,     emerald: false },
    { icon: CheckCircle2,  label: "Принято",       value: acceptedApplications,  emerald: true  },
  ]

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
            <span className="text-xs text-neutral-400 tracking-widest uppercase">Администратор</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors tracking-widest uppercase font-heading">
              Выйти
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-10 stagger-1 relative pl-4">
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-full" />
          <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase mb-2">Административная панель</p>
          <h1 className="text-3xl font-heading font-extrabold leading-tight text-neutral-900">{collegeName}</h1>
          <p className="text-sm text-neutral-400 mt-1">{user.email}</p>
        </div>

        {/* Metric cards — numbers use tabular-nums + no heading font for crisp rendering */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 stagger-2">
          {METRICS.map(({ icon: Icon, label, value, emerald }) => (
            <div key={label} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${emerald ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"}`}>
                <Icon className={`w-4 h-4 ${emerald ? "text-emerald-500" : "text-blue-600"}`} />
              </div>
              <p className={`text-[34px] leading-none font-bold tabular-nums mb-1 ${emerald ? "text-emerald-600" : "text-neutral-900"}`}
                 style={{ fontVariantNumeric: "tabular-nums", WebkitFontSmoothing: "antialiased" }}>
                {value}
              </p>
              <p className="text-[11px] text-neutral-400 font-heading tracking-widest uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* Pending approvals */}
        {pendingProfiles.length > 0 && (
          <section className="mb-10 stagger-3">
            <div className="relative pl-4 mb-4">
              <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-600 rounded-full" />
              <p className="text-[11px] font-heading font-bold text-neutral-700 tracking-[0.2em] uppercase">
                Ожидают одобрения
                <span className="ml-2 font-normal normal-case tracking-normal text-blue-600">— {pendingProfiles.length}</span>
              </p>
            </div>

            <div className="space-y-3">
              {pendingProfiles.map((p) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || null
                const isEmployer = p.role === "employer"
                const employer   = employerMap.get(p.user_id)
                const student    = studentMap2.get(p.user_id)
                const date       = p.created_at
                  ? new Date(p.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
                  : "—"

                const docs = employer?.document_urls ?? []
                return (
                  <div key={p.user_id} className="rounded-xl border border-blue-200 bg-blue-50/40 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Student photo or role icon */}
                        {!isEmployer && p.photo_url ? (
                          <img
                            src={p.photo_url}
                            alt={name ?? "Студент"}
                            className="w-10 h-10 rounded-xl object-cover border border-blue-200 shrink-0"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isEmployer ? "bg-blue-50 border-blue-200" : "bg-blue-50 border-blue-200"}`}>
                            {isEmployer
                              ? <Building2 className="w-4 h-4 text-blue-400" />
                              : <UserCheck className="w-4 h-4 text-blue-600" />}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-heading font-bold text-neutral-900 truncate">
                            {isEmployer
                              ? (employer?.company_name ?? "Компания")
                              : (name ?? "Студент")}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {isEmployer
                              ? "Работодатель"
                              : student?.college_name ? `Студент · ${student.college_name}` : "Студент"}
                            <span className="mx-1.5 text-neutral-300">·</span>
                            {date}
                          </p>
                          {/* Student: photo status */}
                          {!isEmployer && !p.photo_url && (
                            <p className="text-[10px] text-blue-600 mt-1 font-heading font-bold tracking-widest uppercase">Фото не загружено</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <form action={rejectUser.bind(null, p.user_id)}>
                          <button
                            type="submit"
                            className="text-[11px] font-heading font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            Отклонить
                          </button>
                        </form>
                        <form action={approveUser.bind(null, p.user_id)}>
                          <button
                            type="submit"
                            className="text-[11px] font-heading font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-500 transition-all shadow-sm shadow-emerald-500/25"
                          >
                            Одобрить
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Employer documents */}
                    {isEmployer && docs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {docs.map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-heading font-bold text-blue-500 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            Документ {i + 1}
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ))}
                      </div>
                    )}
                    {isEmployer && docs.length === 0 && (
                      <p className="text-[10px] text-blue-600 mt-2 font-heading font-bold tracking-widest uppercase">Документы не загружены</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* CSV roster upload */}
        <section className="mb-8 stagger-4">
          <CsvRosterUpload />
        </section>

        {/* Students table */}
        <section className="mb-8 stagger-5">
          <div className="relative pl-4 mb-4">
            <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
            <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
              Студенты колледжа
              <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">— {totalStudents}</span>
            </p>
          </div>

          {students.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center">
              <p className="text-sm text-neutral-400">Студентов из этого колледжа не зарегистрировано</p>
            </div>
          ) : (
            <AdminStudentsTable rows={studentRows} rosterNames={rosterNames} />
          )}
        </section>

        {/* Applications table */}
        <section className="stagger-6">
          <div className="relative pl-4 mb-4">
            <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
            <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
              Заявки студентов
              <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">— {totalApplications}</span>
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center">
              <p className="text-sm text-neutral-400">Заявок пока нет</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-100 bg-neutral-50/60 hover:bg-neutral-50/60">
                    <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Студент</TableHead>
                    <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Место практики</TableHead>
                    <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Компания</TableHead>
                    <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Статус</TableHead>
                    <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase">Дата</TableHead>
                    <TableHead className="text-[10px] font-heading font-bold text-neutral-400 tracking-widests uppercase"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const student     = studentMap.get(app.student_id)
                    const sp          = student ? profileMap.get(student.user_id) : null
                    const studentName = sp ? `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim() || "—" : "—"
                    const badge       = APP_STATUS_CONFIG[app.status ?? "pending"] ?? APP_STATUS_CONFIG.pending
                    const date        = app.created_at
                      ? new Date(app.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                      : "—"
                    return (
                      <TableRow key={app.id} className="border-neutral-100">
                        <TableCell className="font-heading font-bold text-[13px] text-neutral-900">{studentName}</TableCell>
                        <TableCell className="text-[13px] text-neutral-500">{app.internships?.title ?? "—"}</TableCell>
                        <TableCell className="text-[13px] text-neutral-500">{app.internships?.employers?.company_name ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-heading font-bold tracking-widests uppercase px-2 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px] text-neutral-400">{date}</TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className="flex items-center gap-1 text-[10px] font-heading font-bold tracking-widests uppercase text-neutral-400 hover:text-blue-700 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Переписка
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
