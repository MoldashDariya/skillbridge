"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { ChatThread } from "./chat-thread"

type Message = { id: string; content: string; sender_id: string; created_at: string | null }

type Props = {
  applicationId: string
  currentUserId: string
  currentUserName: string
  otherUserName: string
  readOnly?: boolean
  triggerClassName?: string
  triggerLabel?: string
}

export function ApplicationChatDialog({
  applicationId,
  currentUserId,
  currentUserName,
  otherUserName,
  readOnly = false,
  triggerClassName,
  triggerLabel = "Чат",
}: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    createClient()
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? [])
        setLoading(false)
      })
  }, [open, applicationId])

  const defaultTriggerCls =
    "flex items-center gap-1.5 text-[11px] font-heading font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? defaultTriggerCls}
      >
        <MessageSquare className="w-3 h-3 shrink-0" />
        {triggerLabel}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="px-5 py-4 border-b border-neutral-100 shrink-0">
            <SheetTitle className="font-heading font-bold text-[15px] text-neutral-900">
              Переписка — {otherUserName}
            </SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatThread
                applicationId={applicationId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                otherUserName={otherUserName}
                initialMessages={messages}
                readOnly={readOnly}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
