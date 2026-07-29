import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "./_components/profile-form"
import { PortfolioUploader } from "./_components/portfolio-uploader"
import { PassportSection } from "./_components/passport-section"
import type { Database } from "@/types/supabase"
import { LanguageSwitcher } from "@/components/language-switcher"
import { getPageT } from "@/lib/get-page-t"

export const metadata = { title: "Профиль — SkillBridge KZ" }

type PortfolioItem = Database["public"]["Tables"]["portfolio_items"]["Row"]

export default async function StudentProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, phone, city")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/auth")
  if (profile.role !== "student") redirect("/")

  const { data: student } = await supabase
    .from("students")
    .select("id, college_name, specialty, course_year, bio, skills, gpa, github_url, linkedin_url, behance_url, dribbble_url, figma_url")
    .eq("user_id", user.id)
    .single()

  if (!student) redirect("/student")

  const [portfolioRes, certRes, reviewsRes] = await Promise.all([
    supabase.from("portfolio_items").select("*").eq("student_id", student.id).order("created_at", { ascending: false }),
    supabase.from("student_certificates").select("*").eq("student_id", student.id).order("created_at", { ascending: false }),
    supabase
      .from("employer_reviews")
      .select("id, rating, comment, created_at, employers(company_name)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false }),
  ])

  const portfolioItems = (portfolioRes.data ?? []) as PortfolioItem[]
  const certificates = certRes.data ?? []
  const reviews = (reviewsRes.data ?? []) as Array<{
    id: string
    rating: number
    comment: string | null
    created_at: string | null
    employers: { company_name: string } | null
  }>

  const initialFormValues = {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    college_name: student.college_name ?? "",
    specialty: student.specialty ?? "",
    course_year: student.course_year?.toString() ?? "",
    bio: student.bio ?? "",
    skills: (student.skills ?? []).join(", "),
  }

  const passportInitial = {
    gpa: student.gpa?.toString() ?? "",
    github_url: student.github_url ?? "",
    linkedin_url: student.linkedin_url ?? "",
    behance_url: student.behance_url ?? "",
    dribbble_url: student.dribbble_url ?? "",
    figma_url: student.figma_url ?? "",
  }

  const t = await getPageT()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30">
              <span className="text-white text-[10px] font-heading font-bold">SK</span>
            </div>
            <span className="text-sm font-heading font-bold tracking-wide text-neutral-900">SkillBridge KZ</span>
            <Image src="/skilly-avatar.png" alt="Skilly AI Assistant" width={24} height={24} className="object-contain" />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/student"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors font-heading tracking-widest uppercase"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("common.back")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-10 stagger-1 relative pl-4">
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-full" />
          <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase mb-1">
            {t("dashboard.section_label")}
          </p>
          <h1 className="text-2xl font-heading font-extrabold leading-tight text-neutral-900">
            {t("sections.profile_title")}
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">{user.email}</p>
        </div>

        <section className="stagger-2 rounded-2xl border border-neutral-200 bg-white p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-[3px] h-5 bg-blue-600 rounded-full" />
            <h2 className="font-heading font-bold text-[16px] text-neutral-900">{t("profile.personal_data")}</h2>
          </div>
          <ProfileForm
            userId={user.id}
            studentId={student.id}
            initial={initialFormValues}
          />
        </section>

        <section className="stagger-3 rounded-2xl border border-neutral-200 bg-white p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-[3px] h-5 bg-blue-600 rounded-full" />
            <h2 className="font-heading font-bold text-[16px] text-neutral-900">{t("sections.portfolio_title")}</h2>
            {portfolioItems.length > 0 && (
              <span className="ml-auto text-xs text-neutral-400">{portfolioItems.length} {t("profile.portfolio_works")}</span>
            )}
          </div>
          <PortfolioUploader
            userId={user.id}
            studentId={student.id}
            items={portfolioItems}
          />
        </section>

        <section className="stagger-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-[3px] h-5 bg-blue-600 rounded-full" />
            <h2 className="font-heading font-bold text-[16px] text-neutral-900">{t("profile.passport_title")}</h2>
          </div>
          <PassportSection
            userId={user.id}
            studentId={student.id}
            initial={passportInitial}
            certificates={certificates}
            reviews={reviews}
          />
        </section>
      </main>
    </div>
  )
}
