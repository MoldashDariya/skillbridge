import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, GraduationCap } from "lucide-react"
import { ChatThread } from "@/components/chat-thread"
import { StudentReviewForm } from "./_components/student-review-form"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",  cls: "text-blue-700 border-blue-300 bg-blue-50" },
  at_interview: { label: "На собеседовании", cls: "text-blue-600 border-blue-300 bg-blue-50" },
  interviewing: { label: "На собеседовании", cls: "text-violet-600 border-violet-300 bg-violet-50" },
  accepted:     { label: "Принят",           cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Принят",           cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  rejected:     { label: "Отклонено",        cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
  completed:    { label: "Завершено",        cls: "text-teal-600 border-teal-300 bg-teal-50" },
}

export default async function EmployerApplicationChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: app } = await supabase
    .from("applications")
    .select(`
      id, status,
      internships(id, title, employers(id, company_name, user_id)),
      students(id, college_name, specialty, user_id)
    `)
    .eq("id", id)
    .single()

  if (!app) notFound()

  const internship = app.internships as {
    id: string; title: string;
    employers: { id: string; company_name: string; user_id: string } | null
  } | null

  if (internship?.employers?.user_id !== user.id) redirect("/employer")

  const student = app.students as {
    id: string; college_name: string | null; specialty: string | null; user_id: string
  } | null

  // Fetch student profile separately (no FK relation in Supabase schema)
  const { data: studentProfile } = student
    ? await supabase.from("profiles").select("first_name, last_name").eq("user_id", student.user_id).single()
    : { data: null }

  const studentName = studentProfile
    ? [studentProfile.first_name, studentProfile.last_name].filter(Boolean).join(" ") || "Студент"
    : "Студент"

  const employerName = internship?.employers?.company_name ?? "Работодатель"

  const [messagesRes, reviewRes] = await Promise.all([
    supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: true }),
    app.status === "completed" && student
      ? supabase
          .from("employer_reviews")
          .select("rating, comment")
          .eq("application_id", id)
          .eq("student_id", student.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const messages = (messagesRes.data ?? []) as { id: string; content: string; sender_id: string; created_at: string }[]
  const existingReview = reviewRes.data as { rating: number; comment: string | null } | null
  const badge = STATUS_CONFIG[app.status ?? "pending"] ?? STATUS_CONFIG.pending

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-neutral-200 bg-white shadow-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/employer" className="text-neutral-400 hover:text-neutral-700 transition-colors p-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-4 bg-neutral-200" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-heading font-bold text-blue-600 tracking-widests uppercase truncate">
              {internship?.title ?? "Место практики"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <GraduationCap className="w-3 h-3 text-neutral-400 shrink-0" />
              <p className="text-xs text-neutral-500 truncate">
                {[studentName, student?.college_name, student?.specialty].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] font-heading font-bold tracking-widests uppercase px-2.5 py-1 rounded-full border ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col min-h-0" style={{ height: "calc(100vh - 57px)" }}>
        <ChatThread
          applicationId={id}
          currentUserId={user.id}
          currentUserName={employerName}
          otherUserName={studentName}
          initialMessages={messages}
        />
        {app.status === "completed" && student && (
          <div className="shrink-0 border-t border-neutral-100 bg-white px-4 py-4">
            <StudentReviewForm
              applicationId={id}
              studentId={student.id}
              existingReview={existingReview}
            />
          </div>
        )}
      </div>
    </div>
  )
}
