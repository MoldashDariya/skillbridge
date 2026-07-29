import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { InterviewSimulator } from "./_components/interview-simulator"

export const metadata = { title: "Симулятор собеседования — SkillBridge KZ" }

export default async function SimulatorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: student } = await supabase
    .from("students")
    .select("id, specialty")
    .eq("user_id", user.id)
    .single()

  if (!student) redirect("/student")

  const specialty = student.specialty ?? "Информационные технологии"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/30">
              <span className="text-white text-[10px] font-heading font-bold">SK</span>
            </div>
            <span className="text-sm font-heading font-bold tracking-wide text-neutral-900">
              SkillBridge KZ
            </span>
          </div>
          <Link
            href="/student"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors font-heading tracking-widest uppercase"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Назад
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8 relative pl-4">
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-full" />
          <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase mb-1">
            AI-инструмент
          </p>
          <h1 className="text-2xl font-heading font-extrabold leading-tight text-neutral-900">
            Симулятор собеседования
          </h1>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <InterviewSimulator studentId={student.id} specialty={specialty} />
        </section>
      </main>
    </div>
  )
}
