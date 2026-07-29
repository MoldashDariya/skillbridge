import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import { Building2, FileText, Users, MapPin, Phone, Mail, Search } from "lucide-react"
import Link from "next/link"
import { InternshipCard } from "./_components/internship-card"
import { CreateInternshipDialog } from "./_components/create-internship-form"
import { ApplicationCard } from "./_components/application-card"
import { CompanyProfileDialog } from "./_components/company-profile-dialog"
import { ConnectTelegramButton } from "@/components/connect-telegram-button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { getPageT } from "@/lib/get-page-t"
import type { Database } from "@/types/supabase"

export const metadata = { title: "Кабинет работодателя — SkillBridge KZ" }

type Internship = Database["public"]["Tables"]["internships"]["Row"]

type ApplicationWithRelations = Database["public"]["Tables"]["applications"]["Row"] & {
  internships: { title: string } | null
  students: { id: string; user_id: string; college_name: string | null; specialty: string | null } | null
}

type ProfileSummary = {
  user_id: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
}

export default async function EmployerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, telegram_chat_id")
    .eq("user_id", user.id)
    .single()
  if (!profile) redirect("/auth")
  if (profile.role === "student") redirect("/student")
  if (profile.role === "college_admin") redirect("/admin")

  const { data: employer } = await supabase
    .from("employers")
    .select("id, company_name, company_description, city, contact_email, contact_phone")
    .eq("user_id", user.id)
    .single()
  const companyName = employer?.company_name ?? "Компания"

  const { data: internships } = employer
    ? await supabase.from("internships").select("*").eq("employer_id", employer.id).order("created_at", { ascending: false })
    : { data: [] as Internship[] }

  const { data: reviewsRaw } = employer
    ? await supabase.from("employer_reviews").select("rating").eq("employer_id", employer.id)
    : { data: [] }
  const reviews = reviewsRaw ?? []
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null
  const reviewCount = reviews.length

  const internshipIds = (internships ?? []).map((i) => i.id)

  const { data: applicationsRaw } = internshipIds.length > 0
    ? await supabase.from("applications").select("*, internships(title), students(id, user_id, college_name, specialty)").in("internship_id", internshipIds).order("created_at", { ascending: false })
    : { data: [] as ApplicationWithRelations[] }

  const applications = (applicationsRaw ?? []) as ApplicationWithRelations[]
  const studentUserIds = [...new Set(applications.map((a) => a.students?.user_id).filter((id): id is string => !!id))]

  const { data: profilesRaw } = studentUserIds.length > 0
    ? await supabase.from("profiles").select("user_id, first_name, last_name, photo_url").in("user_id", studentUserIds)
    : { data: [] as ProfileSummary[] }

  const profileMap = new Map(((profilesRaw ?? []) as ProfileSummary[]).map((p) => [p.user_id, p]))

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth")
  }

  const t = await getPageT()

  const SECTIONS = [
    { icon: FileText, title: t("employer.sections_internships_title"), desc: t("employer.sections_internships_desc"), href: null },
    { icon: Users,    title: t("employer.sections_applications_title"), desc: t("employer.sections_applications_desc"), href: null },
    { icon: Search,   title: t("employer.sections_search_title"), desc: t("employer.sections_search_desc"), href: "/employer/search" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30">
              <span className="text-white text-[10px] font-heading font-bold">SK</span>
            </div>
            <span className="text-sm font-heading font-bold tracking-wide text-neutral-900">SkillBridge KZ</span>
            <span className="hidden sm:inline text-neutral-300 text-xs mx-1">·</span>
            <span className="hidden sm:inline text-xs text-neutral-400 tracking-widest uppercase">{t("nav.employer_label")}</span>
            <Image src="/skilly-avatar.png" alt="Skilly AI Assistant" width={24} height={24} className="hidden sm:block object-contain ml-1" />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <form action={signOut}>
              <button type="submit" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors tracking-widest uppercase font-heading">{t("nav.sign_out")}</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-12 stagger-1 relative pl-4">
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-full" />
          <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase mb-2">{t("employer.section_label")}</p>
          <h1 className="text-3xl font-heading font-extrabold leading-tight text-neutral-900">{companyName}</h1>
          <p className="text-sm text-neutral-400 mt-1">{user.email}</p>
          {profile && (
            <div className="mt-3">
              <ConnectTelegramButton profileId={profile.id} connected={!!profile.telegram_chat_id} />
            </div>
          )}
        </div>

        {/* Company profile */}
        <div className="mb-10 stagger-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="relative pl-4">
                <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
                <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
                  {t("employer.company_profile")}
                </p>
              </div>
              {employer && (
                <CompanyProfileDialog
                  employerId={employer.id}
                  initial={{
                    company_description: employer.company_description ?? null,
                    city: employer.city ?? null,
                    contact_email: employer.contact_email ?? null,
                    contact_phone: employer.contact_phone ?? null,
                  }}
                />
              )}
            </div>

            {avgRating !== null && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-amber-400 text-base leading-none">★</span>
                <span className="font-heading font-bold text-[15px] text-neutral-800">{avgRating.toFixed(1)}</span>
                <span className="text-[12px] text-neutral-400">({reviewCount} {reviewCount === 1 ? "отзыв" : reviewCount < 5 ? "отзыва" : "отзывов"})</span>
              </div>
            )}
            {employer?.company_description ? (
              <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{employer.company_description}</p>
            ) : (
              <p className="text-sm text-neutral-400 italic mb-4">{t("employer.no_company_desc")}</p>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-neutral-500">
              {employer?.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />{employer.city}
                </span>
              )}
              {employer?.contact_email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />{employer.contact_email}
                </span>
              )}
              {employer?.contact_phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />{employer.contact_phone}
                </span>
              )}
              {!employer?.city && !employer?.contact_email && !employer?.contact_phone && (
                <span className="text-neutral-400">{t("employer.no_contacts")}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
          {SECTIONS.map(({ icon: Icon, title, desc, href }, i) => {
            const cardCls = `group rounded-xl border border-neutral-200 bg-white p-6 hover:border-blue-400 hover:shadow-md hover:shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-200 stagger-${i + 3}`
            const inner = (
              <>
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <p className="font-heading font-bold text-[15px] mb-1 text-neutral-900">{title}</p>
                <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
              </>
            )
            return href
              ? <Link key={title} href={href} className={cardCls}>{inner}</Link>
              : <div key={title} className={`${cardCls} cursor-pointer`}>{inner}</div>
          })}
        </div>

        <div className="stagger-5">
          <div className="flex items-center justify-between mb-5">
            <div className="relative pl-4">
              <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
              <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">{t("employer.internships_label")}</p>
              {internships && internships.length > 0 && <p className="text-xs text-neutral-400 mt-0.5">{internships.length} {internships.length === 1 ? "запись" : internships.length < 5 ? "записи" : "записей"}</p>}
            </div>
            {employer && <CreateInternshipDialog employerId={employer.id} />}
          </div>
          {!internships || internships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3"><FileText className="w-5 h-5 text-blue-400" /></div>
              <p className="font-heading font-bold text-[15px] mb-1 text-neutral-500">{t("employer.no_internships_title")}</p>
              <p className="text-xs text-neutral-400">{t("employer.no_internships_desc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {internships.map((item) => <InternshipCard key={item.id} item={item} />)}
            </div>
          )}
        </div>

        <div className="mt-12 stagger-6">
          <div className="relative pl-4 mb-5">
            <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
            <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">{t("employer.incoming_apps")}</p>
            {applications.length > 0 && <p className="text-xs text-neutral-400 mt-0.5">{applications.length} {applications.length === 1 ? "заявка" : applications.length < 5 ? "заявки" : "заявок"}</p>}
          </div>
          {applications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3"><Users className="w-5 h-5 text-blue-400" /></div>
              <p className="font-heading font-bold text-[15px] mb-1 text-neutral-500">{t("employer.no_apps_title")}</p>
              <p className="text-xs text-neutral-400">{t("employer.no_apps_desc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {applications.map((app) => {
                const prof = app.students?.user_id ? profileMap.get(app.students.user_id) : null
                const studentName = prof ? [prof.first_name, prof.last_name].filter(Boolean).join(" ") || "Студент" : "Студент"
                const studentPhotoUrl = prof?.photo_url ?? null
                return (
                  <ApplicationCard
                    key={app.id}
                    id={app.id}
                    internshipTitle={app.internships?.title ?? "Практика"}
                    studentName={studentName}
                    studentId={app.students?.id ?? null}
                    studentPhotoUrl={studentPhotoUrl}
                    college={app.students?.college_name ?? null}
                    specialty={app.students?.specialty ?? null}
                    message={app.message}
                    status={app.status}
                    appliedAt={app.created_at}
                    currentUserId={user.id}
                    currentUserName={companyName}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
