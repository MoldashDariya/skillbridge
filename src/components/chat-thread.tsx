"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
}

type Props = {
  applicationId: string
  currentUserId: string
  currentUserName: string
  otherUserName: string
  initialMessages: Message[]
  readOnly?: boolean
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

function formatDay(ts: string) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
}

export function ChatThread({ applicationId, currentUserId, currentUserName, otherUserName, initialMessages, readOnly = false }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Poll every 4 seconds for new messages
  useEffect(() => {
    if (readOnly) return
    pollRef.current = setInterval(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true })
      if (data) setMessages(data)
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [applicationId, readOnly])

  async function send() {
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    setError("")
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ application_id: applicationId, sender_id: currentUserId, content: trimmed })
      .select("id, content, sender_id, created_at")
      .single()
    if (err) { setError(err.message); setSending(false); return }
    setMessages(prev => [...prev, data])
    setText("")
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Group messages by day
  const grouped: { day: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const day = formatDay(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.day === day) last.msgs.push(msg)
    else grouped.push({ day, msgs: [msg] })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-neutral-400 text-sm mt-12">
            <p className="font-heading font-bold tracking-widests uppercase text-[11px] text-neutral-300 mb-1">Нет сообщений</p>
            <p className="text-xs">Начните переписку</p>
          </div>
        )}
        {grouped.map(({ day, msgs }) => (
          <div key={day}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-neutral-100" />
              <span className="text-[10px] text-neutral-400 font-heading font-bold tracking-widests uppercase shrink-0">{day}</span>
              <div className="flex-1 h-px bg-neutral-100" />
            </div>
            {msgs.map((msg) => {
              const isMine = msg.sender_id === currentUserId
              return (
                <div key={msg.id} className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                    <span className={`text-[10px] font-heading font-bold tracking-widests uppercase mb-1 ${isMine ? "text-blue-600" : "text-neutral-400"}`}>
                      {isMine ? currentUserName : otherUserName}
                    </span>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-neutral-300 mt-1 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!readOnly && (
        <div className="border-t border-neutral-100 bg-white px-4 py-3">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать сообщение... (Enter — отправить)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors max-h-32 overflow-y-auto"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="h-11 w-11 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center justify-center shadow-sm shadow-blue-600/25"
            >
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
