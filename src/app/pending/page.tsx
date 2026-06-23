import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Clock, XCircle } from "lucide-react"
import { StudentPhotoUpload } from "./_components/student-photo-upload"
import { EmployerDocsUpload } from "./_components/employer-docs-upload"

export const metadata = { title: "Ожидание одобрения — SkillBridge KZ" }

const ROLE_REDIRECT: Record<string, string> = {
  student: "/student",
  employer: "/employer",
  college_admin: "/admin",
}

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles")
    .select("approval_status, role, photo_url")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/auth")

  if (profile.approval_status === "approved") {
    redirect(ROLE_REDIRECT[profile.role] ?? "/")
  }

  const isRejected = profile.approval_status === "rejected"
  const isEmployer = profile.role === "employer"
  const isStudent  = profile.role === "student"

  // Fetch employer docs if needed
  let employerDocs: string[] | null = null
  if (isEmployer && !isRejected) {
    const { data: emp } = await supabase
      .from("employers")
      .select("document_urls")
      .eq("user_id", user.id)
      .single()
    employerDocs = emp?.document_urls ?? null
  }

  async function signOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[460px]">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/60 overflow-hidden">
          <div className={`h-1 ${isRejected ? "bg-gradient-to-r from-red-500 to-rose-400" : "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400"}`} />

          <div className="px-8 pt-8 pb-8">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isRejected ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                {isRejected
                  ? <XCircle className="w-5 h-5 text-red-400" />
                  : <Clock className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                <p className={`text-[11px] font-heading font-bold tracking-[0.2em] uppercase mb-1 ${isRejected ? "text-red-400" : "text-amber-500"}`}>
                  {isRejected ? "Заявка отклонена" : "На рассмотрении"}
                </p>
                <h1 className="text-[19px] font-heading font-extrabold text-neutral-900 leading-snug">
                  {isRejected ? "Ваша заявка была отклонена" : "Заявка ожидает одобрения"}
                </h1>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {isRejected
                    ? "Администрация отклонила вашу заявку. Если считаете это ошибкой — свяжитесь с колледжем напрямую."
                    : "Администратор колледжа рассматривает вашу заявку. После одобрения вы получите полный доступ."}
                </p>
              </div>
            </div>

            {/* Upload sections for pending users */}
            {!isRejected && (
              <div className="space-y-4 mb-6">
                {isStudent && (
                  <StudentPhotoUpload
                    userId={user.id}
                    initialPhotoUrl={profile.photo_url ?? null}
                  />
                )}
                {isEmployer && (
                  <EmployerDocsUpload
                    userId={user.id}
                    initialDocs={employerDocs}
                  />
                )}
              </div>
            )}

            {/* Sign out */}
            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-xs text-neutral-400 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 rounded-lg px-5 py-2.5 font-heading font-bold tracking-widests uppercase transition-all"
              >
                Выйти из аккаунта
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-400 mt-5">
          SkillBridge KZ · Талгар, Казахстан
        </p>
      </div>
    </div>
  )
}
