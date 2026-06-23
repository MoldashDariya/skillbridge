import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, Building2 } from "lucide-react"
import { ChatThread } from "@/components/chat-thread"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:      { label: "На рассмотрении",  cls: "text-amber-600 border-amber-300 bg-amber-50" },
  at_interview: { label: "На собеседовании", cls: "text-blue-600 border-blue-300 bg-blue-50" },
  accepted:     { label: "Принят",           cls: "text-emerald-600 border-emerald-300 bg-emerald-50" },
  hired:        { label: "Нанят",            cls: "text-emerald-700 border-emerald-400 bg-emerald-100" },
  rejected:     { label: "Отклонено",        cls: "text-neutral-500 border-neutral-200 bg-neutral-50" },
}

export default async function StudentApplicationChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const { data: studentRow } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!studentRow) redirect("/student")

  const { data: app } = await supabase
    .from("applications")
    .select(`
      id, status,
      internships(title, employers(company_name, user_id))
    `)
    .eq("id", id)
    .eq("student_id", studentRow.id)
    .single()

  if (!app) notFound()

  const internship = app.internships as {
    title: string;
    employers: { company_name: string; user_id: string } | null
  } | null

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .single()

  const studentName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Студент"
    : "Студент"

  const employerName = internship?.employers?.company_name ?? "Работодатель"

  const { data: messagesRaw } = await supabase
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
          <Link href="/student" className="text-neutral-400 hover:text-neutral-700 transition-colors p-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-4 bg-neutral-200" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-heading font-bold text-amber-500 tracking-widests uppercase truncate">
              {internship?.title ?? "Место практики"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
              <p className="text-xs text-neutral-500 truncate">{employerName}</p>
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
          currentUserName={studentName}
          otherUserName={employerName}
          initialMessages={messages}
        />
      </div>
    </div>
  )
}
