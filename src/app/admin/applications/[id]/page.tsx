import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ArrowLeft } from "lucide-react"
import { ChatThread } from "@/components/chat-thread"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",  cls: "text-blue-700 border-blue-300 bg-blue-50" },
  at_interview: { label: "На собеседовании", cls: "text-blue-600 border-blue-300 bg-blue-50" },
  accepted:     { label: "Принят",           cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Нанят",            cls: "text-emerald-700 border-emerald-400 bg-emerald-100" },
  rejected:     { label: "Отклонено",        cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

export default async function AdminApplicationView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single()
  if (profile?.role !== "college_admin") redirect("/auth")

  const adminClient = createAdminClient()

  const { data: app } = await adminClient
    .from("applications")
    .select(`
      id, status,
      internships(title, employers(company_name)),
      students(college_name, specialty, user_id)
    `)
    .eq("id", id)
    .single()

  if (!app) notFound()

  const internship = app.internships as {
    title: string;
    employers: { company_name: string } | null
  } | null

  const student = app.students as {
    college_name: string | null; specialty: string | null; user_id: string
  } | null

  // Fetch student profile separately
  const { data: studentProfile } = student
    ? await adminClient.from("profiles").select("first_name, last_name").eq("user_id", student.user_id).single()
    : { data: null }

  const studentName = studentProfile
    ? [studentProfile.first_name, studentProfile.last_name].filter(Boolean).join(" ") || "Студент"
    : "Студент"

  const employerName = internship?.employers?.company_name ?? "Работодатель"

  const { data: messagesRaw } = await adminClient
    .from("messages")
    .select("id, content, sender_id, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: true })

  const messages = (messagesRaw ?? []) as { id: string; content: string; sender_id: string; created_at: string }[]
  const badge = STATUS_CONFIG[app.status ?? "pending"] ?? STATUS_CONFIG.pending

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-neutral-200 bg-white shadow-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-neutral-400 hover:text-neutral-700 transition-colors p-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-4 bg-neutral-200" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-heading font-bold text-blue-600 tracking-widests uppercase truncate">
              {internship?.title ?? "Место практики"}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {[studentName, student?.college_name, employerName].filter(Boolean).join(" · ")}
            </p>
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
          currentUserName="Администратор"
          otherUserName={`${studentName} ↔ ${employerName}`}
          initialMessages={messages}
          readOnly
        />
      </div>
    </div>
  )
}
