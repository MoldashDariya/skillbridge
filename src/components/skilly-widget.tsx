"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SkillyMascot } from "@/components/skilly-mascot"
import { X, Send, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { askSkilly, type SkillyMessage } from "@/app/actions/skilly"
import { useTranslation } from "@/contexts/language-context"

const ROUTES: Record<string, string> = {
  interview: "/student/simulator",
  resume: "/student",
  vacancies: "/student#internships",
}

export function SkillyWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { locale, t } = useTranslation()

  const [messages, setMessages] = useState<SkillyMessage[]>(() => [
    { role: "assistant", content: t("skilly.welcome") },
  ])

  useEffect(() => {
    setMessages((prev) => [
      { role: "assistant", content: t("skilly.welcome") },
      ...prev.slice(1),
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  function send() {
    const trimmed = input.trim()
    if (!trimmed || isPending) return
    setInput("")

    const userMsg: SkillyMessage = { role: "user", content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)

    // Skip the canned welcome when building API history
    const apiHistory = nextMessages.slice(1)

    startTransition(async () => {
      const result = await askSkilly(apiHistory, locale)

      if (result.type === "text") {
        setMessages((prev) => [...prev, { role: "assistant", content: result.content }])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("skilly.redirecting") },
        ])
        setTimeout(() => {
          router.push(ROUTES[result.destination])
          setOpen(false)
        }, 700)
      }
    })
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") send()
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("skilly.open_label")}
        className="fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          boxShadow: "0 8px 32px rgba(124, 58, 237, 0.45)",
        }}
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <SkillyMascot className="w-9 h-9" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-[360px] flex flex-col rounded-2xl overflow-hidden border"
          style={{
            background: "linear-gradient(160deg, #0d0c18 0%, #161428 100%)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.15)",
            maxHeight: "min(520px, calc(100vh - 120px))",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                boxShadow: "0 4px 12px rgba(124,58,237,0.4)",
              }}
            >
              <SkillyMascot className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white leading-none tracking-tight">
                Skilly AI
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#a5b4fc" }}>
                {t("skilly.subtitle")}
              </p>
            </div>
            <div
              className="ml-auto w-2 h-2 rounded-full shrink-0"
              style={{
                background: "#34d399",
                boxShadow: "0 0 8px rgba(52,211,153,0.6)",
              }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0" style={{ minHeight: "200px" }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-6 h-6 rounded-lg overflow-hidden shrink-0 mb-0.5 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
                  >
                    <span className="text-white text-[9px] font-bold leading-none">S</span>
                  </div>
                )}
                <div
                  className="max-w-[78%] px-3.5 py-2.5 text-[13px]"
                  style={
                    msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)",
                          color: "#fff",
                          borderRadius: "18px 18px 4px 18px",
                          lineHeight: "1.5",
                        }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "18px 18px 18px 4px",
                        }
                  }
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none leading-snug [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mt-1 [&>ul]:mb-1 [&>ol]:mt-1 [&>ol]:mb-1 [&>ol]:pl-4 [&>ul]:pl-4 [&_li]:my-0.5 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex items-end gap-2 justify-start">
                <div
                  className="w-6 h-6 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
                >
                  <span className="text-white text-[9px] font-bold leading-none">S</span>
                </div>
                <div
                  className="px-4 py-3 flex gap-1.5 items-center rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "18px 18px 18px 4px",
                  }}
                >
                  {[0, 120, 240].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "#818cf8", animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 flex gap-2 shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t("skilly.placeholder")}
              disabled={isPending}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none disabled:opacity-50 transition-colors"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
              }}
            />
            <button
              onClick={send}
              disabled={isPending || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all shrink-0 hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
              }}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
