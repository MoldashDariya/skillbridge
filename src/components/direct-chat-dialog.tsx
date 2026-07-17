"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { DirectChatThread } from "./direct-chat-thread"
import { getOrCreateDirectThread } from "@/app/employer/_actions"

type Message = { id: string; content: string; sender_id: string; created_at: string | null }

type Props = {
  employerId: string
  studentId: string
  currentUserId: string
  currentUserName: string
  studentName: string
  triggerClassName?: string
  triggerLabel?: string
}

export function DirectChatDialog({
  employerId,
  studentId,
  currentUserId,
  currentUserName,
  studentName,
  triggerClassName,
  triggerLabel = "Написать",
}: Props) {
  const [open, setOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState("")

  async function handleOpen() {
    setOpen(true)
    if (threadId) return

    setLoading(true)
    setInitError("")
    const result = await getOrCreateDirectThread(employerId, studentId)
    if (result.error || !result.threadId) {
      setInitError(result.error ?? "Ошибка")
      setLoading(false)
      return
    }

    const id = result.threadId
    setThreadId(id)

    const supabase = createClient()
    const { data } = await supabase
      .from("direct_messages")
      .select("id, content, sender_id, created_at")
      .eq("thread_id", id)
      .order("created_at", { ascending: true })
    setMessages(data ?? [])
    setLoading(false)
  }

  const defaultTriggerCls =
    "flex items-center gap-1.5 text-[11px] font-heading font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={triggerClassName ?? defaultTriggerCls}
      >
        <MessageSquare className="w-3 h-3 shrink-0" />
        {triggerLabel}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="px-5 py-4 border-b border-neutral-100 shrink-0">
            <SheetTitle className="font-heading font-bold text-[15px] text-neutral-900">
              Переписка — {studentName}
            </SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          ) : initError ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-red-500">{initError}</p>
            </div>
          ) : threadId ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <DirectChatThread
                threadId={threadId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                otherUserName={studentName}
                initialMessages={messages}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
