import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Users, BookmarkCheck } from "lucide-react"
import Link from "next/link"
import { calculateProfileReadiness } from "@/lib/profile-readiness"
import { SpecialtyFilter } from "./_components/specialty-filter"
import { StudentSearchCard } from "./_components/student-search-card"

export const metadata = { title: "Поиск студентов — SkillBridge KZ" }

export default async function EmployerSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ specialty?: string; tab?: string }>
}) {
  const { specialty: specialtyFilter = "", tab = "all" } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()
  if (!profile) redirect("/auth")
  if (profile.role !== "employer") redirect("/student")

  const { data: employer } = await supabase
    .from("employers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .single()

  // Fetch all approved student profiles
  const { data: approvedProfilesRaw } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, photo_url")
    .eq("approval_status", "approved")
    .eq("role", "student")

  const approvedProfiles = approvedProfilesRaw ?? []
  const approvedUserIds = approvedProfiles.map((p) => p.user_id)

  type StudentRow = {
    id: string
    user_id: string
    college_name: string | null
    specialty: string | null
    course_year: number | null
    skills: string[] | null
    gpa: number | null
    gpa_verified: boolean
    portfolio_items: { id: string }[]
    student_certificates: { id: string }[]
  }

  const { data: studentsRaw } = approvedUserIds.length > 0
    ? await supabase
        .from("students")
        .select("id, user_id, college_name, specialty, course_year, skills, gpa, gpa_verified, portfolio_items(id), student_certificates(id)")
        .in("user_id", approvedUserIds)
    : { data: [] as StudentRow[] }

  const profileMap = new Map(approvedProfiles.map((p) => [p.user_id, p]))

  // Build enriched list with readiness scores
  const allStudents = (studentsRaw ?? []).map((s) => {
    const prof = profileMap.get(s.user_id)
    const portfolioCount = Array.isArray(s.portfolio_items) ? s.portfolio_items.length : 0
    const certCount = Array.isArray(s.student_certificates) ? s.student_certificates.length : 0
    const readiness = calculateProfileReadiness({
      photoUrl: prof?.photo_url,
      hasPortfolio: portfolioCount > 0,
      hasCertificates: certCount > 0,
      isApproved: true,
      hasBasicFields: !!(prof?.first_name && prof?.last_name && s.college_name && s.specialty && s.course_year),
    })
    return { ...s, prof, readiness }
  })

  // Specialties for filter dropdown (from all students)
  const specialties = [...new Set(allStudents.map((s) => s.specialty).filter((x): x is string => !!x))].sort()

  // Apply specialty filter
  const filtered = specialtyFilter
    ? allStudents.filter((s) => s.specialty === specialtyFilter)
    : allStudents

  // Sort: readiness score desc, then gpa desc
  filtered.sort((a, b) => {
    if (b.readiness.score !== a.readiness.score) return b.readiness.score - a.readiness.score
    return (b.gpa ?? 0) - (a.gpa ?? 0)
  })

  // Saved student IDs for this employer
  const { data: savedRaw } = employer
    ? await supabase.from("saved_students").select("student_id").eq("employer_id", employer.id)
    : { data: [] }
  const savedIds = new Set((savedRaw ?? []).map((r) => r.student_id))

  const savedStudents = filtered.filter((s) => savedIds.has(s.id))
  const displayList = tab === "saved" ? savedStudents : filtered

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth")
  }

  const companyName = employer?.company_name ?? "Компания"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/employer" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30">
                <span className="text-white text-[10px] font-heading font-bold">SK</span>
              </div>
              <span className="text-sm font-heading font-bold tracking-wide text-neutral-900 group-hover:text-blue-700 transition-colors">SkillBridge KZ</span>
            </Link>
            <span className="text-neutral-300 text-xs mx-1">·</span>
            <span className="text-xs text-neutral-400 tracking-widest uppercase">Поиск студентов</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors tracking-widest uppercase font-heading">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8 relative pl-4">
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-full" />
          <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase mb-1">
            {companyName}
          </p>
          <h1 className="text-2xl font-heading font-extrabold leading-tight text-neutral-900">
            Поиск студентов
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Студенты с одобренным профилем, отсортированные по готовности
          </p>
        </div>

        {/* Tabs + Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
            <Link
              href={`/employer/search${specialtyFilter ? `?specialty=${encodeURIComponent(specialtyFilter)}` : ""}`}
              className={`text-[11px] font-heading font-bold tracking-widest uppercase px-4 py-1.5 rounded-md transition-all ${
                tab !== "saved"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Все ({filtered.length})
              </span>
            </Link>
            <Link
              href={`/employer/search?tab=saved${specialtyFilter ? `&specialty=${encodeURIComponent(specialtyFilter)}` : ""}`}
              className={`text-[11px] font-heading font-bold tracking-widest uppercase px-4 py-1.5 rounded-md transition-all ${
                tab === "saved"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <BookmarkCheck className="w-3 h-3" />
                Сохранённые ({savedStudents.length})
              </span>
            </Link>
          </div>

          {/* Specialty filter */}
          <SpecialtyFilter specialties={specialties} current={specialtyFilter} />
        </div>

        {/* Results */}
        {displayList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3">
              {tab === "saved"
                ? <BookmarkCheck className="w-5 h-5 text-blue-400" />
                : <Users className="w-5 h-5 text-blue-400" />
              }
            </div>
            <p className="font-heading font-bold text-[15px] text-neutral-500 mb-1">
              {tab === "saved" ? "Нет сохранённых студентов" : "Студенты не найдены"}
            </p>
            <p className="text-xs text-neutral-400">
              {tab === "saved"
                ? "Нажмите «Сохранить» на карточке студента"
                : specialtyFilter
                ? "Попробуйте изменить фильтр специальности"
                : "Пока нет одобренных студентов в системе"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayList.map((s) => (
              <StudentSearchCard
                key={s.id}
                studentId={s.id}
                employerId={employer?.id ?? ""}
                currentUserId={user.id}
                currentUserName={companyName}
                firstName={s.prof?.first_name ?? null}
                lastName={s.prof?.last_name ?? null}
                photoUrl={s.prof?.photo_url ?? null}
                collegeNome={s.college_name}
                specialty={s.specialty}
                courseYear={s.course_year}
                gpa={s.gpa}
                gpaVerified={s.gpa_verified}
                skills={s.skills}
                readiness={s.readiness}
                initialSaved={savedIds.has(s.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
