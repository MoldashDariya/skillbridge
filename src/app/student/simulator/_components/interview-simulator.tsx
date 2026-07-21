"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Mic, MicOff, Send, RotateCcw, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sendMessage, synthesizeSpeech, saveSimulation } from "../_actions"
import type { ChatMsg } from "../_actions"

// ── Web Speech API types ──────────────────────────────────────────────────────
interface SREvent extends Event {
  results: { length: number; [i: number]: { [j: number]: { transcript: string } } }
}
interface SRInstance extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: SREvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void; stop(): void
}
interface SRCtor { new(): SRInstance }
type SRWindow = Window & { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }

// ── Constants & helpers ───────────────────────────────────────────────────────
const TOTAL = 10
type Lang = "ru-RU" | "kk-KZ"
type Phase = "idle" | "starting" | "ai-speaking" | "user-turn" | "recording" | "submitting" | "saving" | "done" | "error"

function scoreColor(s: number) {
  return s >= 8 ? "text-emerald-500" : s >= 5 ? "text-amber-500" : "text-red-500"
}

// ── Voice visualizer ──────────────────────────────────────────────────────────
function VoiceVisualizer({ active }: { active: boolean }) {
  return (
    <>
      <style>{`@keyframes vbar{0%{height:4px}100%{height:26px}}`}</style>
      <div className="flex items-end gap-1 h-7">
        {([0, 0.18, 0.32, 0.1] as number[]).map((delay, i) => (
          <span
            key={i}
            style={{
              display: "block", width: 5, borderRadius: 3,
              backgroundColor: active ? "#2563eb" : "#d1d5db",
              height: active ? undefined : 4,
              animation: active ? `vbar 0.6s ease-in-out ${delay}s infinite alternate` : "none",
              transition: "background-color 0.2s",
            }}
          />
        ))}
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type Props = { studentId: string; specialty: string }

export function InterviewSimulator({ studentId, specialty }: Props) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState("")
  const [lang, setLang] = useState<Lang>("ru-RU")
  const [isPlaying, setIsPlaying] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [srSupported, setSrSupported] = useState(false)

  const srRef = useRef<SRInstance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const phaseRef = useRef<Phase>("idle")

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    const w = window as SRWindow
    setSrSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, phase])

  const userTurns = messages.filter(m => m.role === "user").length

  // ── Audio playback ──────────────────────────────────────────────────────────
  async function playAudio(base64: string, onEnd: () => void) {
    try {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }))
      const audio = new Audio(url)
      audioRef.current = audio
      setIsPlaying(true)
      const cleanup = () => { setIsPlaying(false); URL.revokeObjectURL(url); onEnd() }
      audio.onended = cleanup
      audio.onerror = cleanup
      await audio.play()
    } catch {
      setIsPlaying(false)
      onEnd()
    }
  }

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setIsPlaying(false)
  }

  // ── AI helpers ──────────────────────────────────────────────────────────────
  async function speakAndContinue(question: string) {
    setPhase("ai-speaking")
    const tts = await synthesizeSpeech(question)
    if ("audioBase64" in tts) {
      await playAudio(tts.audioBase64, () => setPhase("user-turn"))
    } else {
      setPhase("user-turn")
    }
  }

  function buildApiHistory(msgs: ChatMsg[]) {
    return [
      { role: "user" as const, content: "Начни собеседование" },
      ...msgs.map(m => ({ role: m.role, content: m.content })),
    ]
  }

  // ── Start ───────────────────────────────────────────────────────────────────
  async function startSimulation() {
    stopAudio()
    setMessages([])
    setDraft("")
    setPhase("starting")

    const res = await sendMessage([{ role: "user", content: "Начни собеседование" }], specialty)
    if ("error" in res) { setErrorMsg(res.error); setPhase("error"); return }

    const firstMsg: ChatMsg = { role: "assistant", content: res.next_question }
    setMessages([firstMsg])
    await speakAndContinue(res.next_question)
  }

  // ── STT ─────────────────────────────────────────────────────────────────────
  function startRecording() {
    const w = window as SRWindow
    const SRCls = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SRCls) return
    const r = new SRCls()
    r.lang = lang; r.continuous = true; r.interimResults = true
    r.onresult = (e: SREvent) => {
      let t = ""
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      setDraft(t)
    }
    r.onerror = stopRecording
    r.onend = () => { if (phaseRef.current === "recording") setPhase("user-turn") }
    srRef.current = r
    r.start()
    setPhase("recording")
  }

  function stopRecording() {
    srRef.current?.stop(); srRef.current = null
    setPhase("user-turn")
  }

  // ── Submit answer ───────────────────────────────────────────────────────────
  async function submitAnswer() {
    const answer = draft.trim()
    if (!answer) return
    if (phase === "recording") { srRef.current?.stop(); srRef.current = null }
    setDraft("")
    setPhase("submitting")

    const withAnswer: ChatMsg[] = [...messages, { role: "user", content: answer }]
    setMessages(withAnswer)
    const newTurns = withAnswer.filter(m => m.role === "user").length

    const res = await sendMessage(buildApiHistory(withAnswer), specialty)
    if ("error" in res) { setErrorMsg(res.error); setPhase("error"); return }

    const { score, next_question } = res

    // Stamp score onto the user message we just added
    const scored: ChatMsg[] = withAnswer.map((m, i) =>
      i === withAnswer.length - 1 && score !== null ? { ...m, score } : m
    )

    if (newTurns >= TOTAL) {
      setMessages(scored)
      await doSave(scored)
    } else {
      const withQ: ChatMsg[] = [...scored, { role: "assistant", content: next_question }]
      setMessages(withQ)
      await speakAndContinue(next_question)
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function doSave(msgs: ChatMsg[]) {
    setPhase("saving")
    const scores = msgs.filter(m => m.role === "user" && m.score != null).map(m => m.score!)
    const avg = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 0
    const res = await saveSimulation(studentId, specialty, msgs, avg)
    if (res.error) { setErrorMsg(res.error); setPhase("error"); return }
    setPhase("done")
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30">
          <Mic className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-heading font-extrabold text-neutral-900 mb-1">Симулятор собеседования</h2>
        <p className="text-sm text-neutral-500 mb-1">
          Специальность: <strong className="text-neutral-800">{specialty}</strong>
        </p>
        <p className="text-xs text-neutral-400 mb-8 max-w-xs leading-relaxed">
          AI‑HR задаст 10 вопросов. Отвечайте голосом или текстом — каждый ответ оценивается.
        </p>
        <Button
          onClick={startSimulation}
          className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs tracking-widest uppercase shadow-sm shadow-blue-600/25"
        >
          Начать симуляцию
        </Button>
      </div>
    )
  }

  // ── LOADING / SAVING ──────────────────────────────────────────────────────────
  if (phase === "starting" || phase === "saving") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-heading font-bold text-neutral-400 tracking-widest uppercase">
          {phase === "saving" ? "Сохранение результатов..." : "Подготовка..."}
        </p>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <XCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-600 font-heading font-bold">{errorMsg}</p>
        <Button variant="outline" onClick={() => setPhase("idle")} className="h-9 px-5 text-xs font-heading font-bold tracking-widest uppercase">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Попробовать снова
        </Button>
      </div>
    )
  }

  // ── DONE ──────────────────────────────────────────────────────────────────────
  if (phase === "done") {
    const userMsgs = messages.filter(m => m.role === "user")
    const scores = userMsgs.filter(m => m.score != null).map(m => m.score!)
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    // Build Q/A pairs: assistant[i] → user[i]
    const assistantMsgs = messages.filter(m => m.role === "assistant")
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-[11px] font-heading font-bold tracking-[0.2em] text-neutral-400 uppercase mb-2">
            Симуляция завершена
          </p>
          <p className="text-5xl font-heading font-extrabold text-neutral-900 leading-none">
            {avg.toFixed(1)}<span className="text-2xl text-neutral-400">/10</span>
          </p>
          <p className="text-sm text-neutral-500 mt-2">Средний балл</p>
        </div>
        <div className="space-y-3">
          {assistantMsgs.map((q, i) => {
            const a = userMsgs[i]
            if (!a) return null
            return (
              <div key={i} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-heading font-bold text-neutral-700 leading-snug">{q.content}</p>
                  {a.score != null && (
                    <span className={`shrink-0 text-xl font-heading font-extrabold leading-none ${scoreColor(a.score)}`}>
                      {a.score}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 italic leading-relaxed">«{a.content}»</p>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={() => { setMessages([]); setPhase("idle") }} variant="outline"
            className="flex-1 h-10 text-xs font-heading font-bold tracking-widest uppercase">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Повторить
          </Button>
          <Link href="/student" className="flex-1">
            <Button className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold tracking-widest uppercase">
              На главную
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── CHAT VIEW (ai-speaking | user-turn | recording | submitting) ──────────────
  const isInputDisabled = phase === "ai-speaking" || phase === "submitting"

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${
              i < userTurns ? "bg-blue-600" : i === userTurns ? "bg-blue-300" : "bg-neutral-200"
            }`} />
          ))}
        </div>
        <span className="text-[11px] font-heading font-bold text-neutral-400 tracking-widest uppercase">
          {userTurns} / {TOTAL}
        </span>
      </div>

      {/* Chat messages */}
      <div className="flex flex-col gap-3 min-h-[260px] max-h-[380px] overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mb-0.5 shadow-sm shadow-blue-600/30">
                  <span className="text-white text-[9px] font-heading font-bold">HR</span>
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-blue-50 border border-blue-100 px-4 py-3">
                  <p className="text-sm text-neutral-800 leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="rounded-2xl rounded-br-sm bg-neutral-900 px-4 py-3 relative">
                  <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                  {msg.score != null && (
                    <span className={`absolute -top-2.5 -right-2.5 text-xs font-heading font-extrabold bg-white border border-neutral-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm ${scoreColor(msg.score)}`}>
                      {msg.score}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* AI typing indicator */}
        {(phase === "ai-speaking" || phase === "submitting") && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30">
                <span className="text-white text-[9px] font-heading font-bold">HR</span>
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-3">
                <VoiceVisualizer active={isPlaying} />
                {!isPlaying && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-100 pt-4 space-y-3">
        {/* Visualizer + lang toggle row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VoiceVisualizer active={isPlaying} />
            {phase === "ai-speaking" && (
              <span className="text-[11px] font-heading font-bold text-blue-500 tracking-widest uppercase animate-pulse">
                HR говорит...
              </span>
            )}
          </div>
          {/* Language toggle */}
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
            {(["ru-RU", "kk-KZ"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 text-[10px] font-heading font-bold tracking-widest uppercase transition-colors ${
                  lang === l ? "bg-blue-600 text-white" : "bg-white text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {l === "ru-RU" ? "Рус" : "Қаз"}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="w-full min-h-[80px] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={isInputDisabled ? "Подождите, HR отвечает..." : "Ваш ответ (или используйте микрофон)..."}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          disabled={isInputDisabled}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey && !isInputDisabled) { e.preventDefault(); submitAnswer() } }}
        />

        <div className="flex items-center gap-2">
          {/* Mic button */}
          {srSupported && (
            phase === "recording" ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-heading font-bold tracking-widest uppercase hover:bg-red-100 transition-all animate-pulse"
              >
                <MicOff className="w-3.5 h-3.5" />Стоп
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={isInputDisabled}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-600 text-xs font-heading font-bold tracking-widest uppercase hover:bg-neutral-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Mic className="w-3.5 h-3.5" />Голос
              </button>
            )
          )}

          <Button
            onClick={submitAnswer}
            disabled={!draft.trim() || isInputDisabled}
            className="ml-auto h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold tracking-widest uppercase shadow-sm shadow-blue-600/25 disabled:opacity-40"
          >
            {phase === "submitting" ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Оценка...</>
            ) : (
              <><Send className="w-3.5 h-3.5 mr-1.5" />Отправить</>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-neutral-300 text-right">Ctrl+Enter для отправки</p>
      </div>
    </div>
  )
}
