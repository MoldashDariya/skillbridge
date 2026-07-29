"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { RotateCcw, CheckCircle2, XCircle, Loader2, Mic, MicOff, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Conversation } from "@11labs/client"
import type { DisconnectionDetails } from "@11labs/client"
import { evaluateTranscript, saveSimulation } from "../_actions"
import type { EvaluationResult } from "../_actions"
import { useTranslation } from "@/contexts/language-context"
import type { Locale } from "@/lib/i18n"

// ── Skilly persona system prompt ──────────────────────────────────────────────
function buildSkillyPrompt(specialty: string, language: Locale): string {
  const base = `You are Skilly, a friendly, encouraging, and highly professional AI interviewer. You are the official mascot of the SkillBridge platform for students in Kazakhstan.

Always briefly introduce yourself as Skilly at the very start of the interview. Keep a warm, supportive tone throughout, but conduct a rigorous, professional interview.

You are interviewing a candidate for the position: ${specialty}

Ask 5–7 technical questions relevant to this specialty. After each candidate answer, give a brief encouraging remark before moving to the next question. Conclude by warmly thanking the candidate for their time.`

  if (language === "en") {
    return `${base}\n\nCRITICAL: Conduct the ENTIRE interview STRICTLY IN ENGLISH. Never switch to any other language.`
  }
  if (language === "kz") {
    return `${base}\n\nМАҢЫЗДЫ: Тұтас сұхбатты тек ҚАЗАҚ ТІЛІНДЕ жүргіз. Ешқашан тілді ауыстырма.`
  }
  return `${base}\n\nВАЖНО: Веди ВСЁ собеседование СТРОГО НА РУССКОМ ЯЗЫКЕ. Никогда не переходи на другой язык.`
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase =
  | "idle"
  | "requesting-mic"
  | "mic-error"
  | "connecting"
  | "speaking"
  | "listening"
  | "evaluating"
  | "saving"
  | "done"
  | "error"

type TranscriptEntry = { role: "ai" | "user"; message: string }

function scoreColor(s: number) {
  return s >= 8 ? "text-emerald-400" : s >= 5 ? "text-amber-400" : "text-red-400"
}

// ── Morphing Blob ─────────────────────────────────────────────────────────────
const BLOB_CSS = `
  @keyframes blob-speak {
    0%   { transform:scale(1);    border-radius:58% 42% 62% 38%/45% 55% 45% 55%; }
    20%  { transform:scale(1.10); border-radius:42% 58% 45% 55%/62% 38% 58% 42%; }
    40%  { transform:scale(1.18); border-radius:55% 45% 38% 62%/38% 62% 42% 58%; }
    60%  { transform:scale(1.12); border-radius:38% 62% 58% 42%/58% 42% 62% 38%; }
    80%  { transform:scale(1.05); border-radius:62% 38% 42% 58%/42% 58% 38% 62%; }
    100% { transform:scale(1);    border-radius:58% 42% 62% 38%/45% 55% 45% 55%; }
  }
  @keyframes blob-listen {
    0%,100% { transform:scale(1);    border-radius:50%; }
    50%     { transform:scale(1.07); border-radius:58% 42% 52% 48%/48% 56% 44% 52%; }
  }
  @keyframes blob-think {
    0%,100% { opacity:0.7; transform:scale(0.97); border-radius:50%; }
    50%     { opacity:1;   transform:scale(1.05); border-radius:54% 46% 50% 50%/50% 54% 46% 50%; }
  }
  @keyframes blob-idle {
    0%,100% { transform:scale(1);    border-radius:50%; opacity:0.75; }
    50%     { transform:scale(1.04); border-radius:54% 46% 50% 50%; opacity:0.9; }
  }
  @keyframes orb-a {
    0%  { transform:translate(-22px,-16px) scale(1); }
    33% { transform:translate(16px,-24px) scale(0.88); }
    66% { transform:translate(-10px,20px) scale(1.12); }
    100%{ transform:translate(-22px,-16px) scale(1); }
  }
  @keyframes orb-b {
    0%  { transform:translate(20px,22px) scale(0.92); }
    33% { transform:translate(-18px,10px) scale(1.1); }
    66% { transform:translate(24px,-16px) scale(0.85); }
    100%{ transform:translate(20px,22px) scale(0.92); }
  }
`

function MorphingBlob({ phase, volume = 0 }: { phase: Phase; volume?: number }) {
  const isSpeaking = phase === "speaking"
  const isListening = phase === "listening"
  const isThinking =
    phase === "evaluating" ||
    phase === "saving" ||
    phase === "connecting" ||
    phase === "requesting-mic"

  const mainGrad = isSpeaking
    ? "radial-gradient(ellipse at 30% 25%, #60a5fa, #2563eb 60%, #1e3a8a)"
    : isListening
    ? "radial-gradient(ellipse at 30% 25%, #34d399, #059669 60%, #064e3b)"
    : isThinking
    ? "radial-gradient(ellipse at 30% 25%, #a78bfa, #7c3aed 60%, #4c1d95)"
    : "radial-gradient(ellipse at 30% 25%, #93c5fd, #3b82f6 60%, #1e3a8a)"

  const orbA = isSpeaking ? "#3b82f6" : isListening ? "#10b981" : isThinking ? "#8b5cf6" : "#60a5fa"
  const orbB = isSpeaking ? "#93c5fd" : isListening ? "#6ee7b7" : isThinking ? "#c4b5fd" : "#bfdbfe"

  // Volume drives glow intensity
  const baseSize = isSpeaking ? 70 : isListening ? 70 : isThinking ? 60 : 40
  const dynSize = baseSize + volume * 50
  const baseAlpha = isSpeaking ? 0.55 : isListening ? 0.50 : isThinking ? 0.45 : 0.30
  const dynAlpha = Math.min(1, baseAlpha + volume * 0.4)

  const glow = isSpeaking
    ? `0 0 ${dynSize}px rgba(37,99,235,${dynAlpha}),0 0 ${dynSize * 2}px rgba(59,130,246,${dynAlpha * 0.5})`
    : isListening
    ? `0 0 ${dynSize}px rgba(5,150,105,${dynAlpha}),0 0 ${dynSize * 2}px rgba(16,185,129,${dynAlpha * 0.5})`
    : isThinking
    ? "0 0 60px rgba(124,58,237,0.65),0 0 120px rgba(139,92,246,0.28)"
    : "0 0 40px rgba(59,130,246,0.40),0 0 80px rgba(147,197,253,0.20)"

  const mainAnim = isSpeaking
    ? "blob-speak 2s ease-in-out infinite"
    : isListening
    ? "blob-listen 3s ease-in-out infinite"
    : isThinking
    ? "blob-think 2s ease-in-out infinite"
    : "blob-idle 5s ease-in-out infinite"

  const dA = isSpeaking ? "2.8s" : isListening ? "3.5s" : "5s"
  const dB = isSpeaking ? "2.2s" : isListening ? "4.0s" : "6s"

  return (
    <>
      <style>{BLOB_CSS}</style>
      <div
        style={{
          position: "relative",
          width: 200,
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            background: orbA,
            borderRadius: "50%",
            filter: "blur(38px)",
            opacity: 0.4,
            animation: `orb-a ${dA} ease-in-out infinite`,
            transition: "background 0.6s",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            background: orbB,
            borderRadius: "50%",
            filter: "blur(26px)",
            opacity: 0.38,
            animation: `orb-b ${dB} ease-in-out infinite`,
            transition: "background 0.6s",
          }}
        />
        <div
          style={{
            position: "relative",
            width: 128,
            height: 128,
            background: mainGrad,
            boxShadow: glow,
            animation: mainAnim,
            transition: "background 0.6s, box-shadow 0.12s",
          }}
        />
        {/* Skilly avatar centered on the blob, unaffected by blob deformation */}
        <div
          style={{
            position: "absolute",
            width: 88,
            height: 88,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <Image
            src="/skilly-avatar.png"
            alt="Skilly"
            width={88}
            height={88}
            className="object-contain drop-shadow-lg"
            priority
          />
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type Props = { studentId: string; specialty: string }

export function InterviewSimulator({ studentId, specialty }: Props) {
  const [phase, setPhase]           = useState<Phase>("idle")
  const [volume, setVolume]         = useState(0)
  const [turnCount, setTurnCount]   = useState(0)
  const [errorMsg, setErrorMsg]     = useState("")
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)

  const { locale } = useTranslation()

  const conversationRef = useRef<Conversation | null>(null)
  const transcriptRef   = useRef<TranscriptEntry[]>([])
  const phaseRef        = useRef<Phase>("idle")
  const evaluatingRef   = useRef(false)
  const isMountedRef    = useRef(true)

  useEffect(() => { phaseRef.current = phase }, [phase])

  // Volume polling — 80 ms interval, only while connected
  useEffect(() => {
    if (phase !== "speaking" && phase !== "listening") {
      setVolume(0)
      return
    }
    const id = setInterval(() => {
      const conv = conversationRef.current
      if (!conv) return
      const vol =
        phaseRef.current === "speaking"
          ? conv.getOutputVolume()
          : conv.getInputVolume()
      setVolume(vol)
    }, 80)
    return () => clearInterval(id)
  }, [phase])

  // Graceful cleanup on unmount — mark unmounted BEFORE endSession so onDisconnect
  // doesn't trigger a spurious LLM evaluation for a navigated-away session
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      conversationRef.current?.endSession()
    }
  }, [])

  async function handleConversationEnd() {
    // Skip if unmounted (user navigated away) or already running
    if (!isMountedRef.current) return
    if (evaluatingRef.current) return
    evaluatingRef.current = true

    const transcript = transcriptRef.current
    if (!transcript.length) {
      setPhase("idle")
      evaluatingRef.current = false
      return
    }

    const transcriptText = transcript
      .map(e => `${e.role === "ai" ? "HR" : "Кандидат"}: ${e.message}`)
      .join("\n")

    setPhase("evaluating")
    const result = await evaluateTranscript(transcriptText, specialty, locale)
    if ("error" in result) {
      setErrorMsg(result.error)
      setPhase("error")
      evaluatingRef.current = false
      return
    }

    setEvaluation(result)
    setPhase("saving")

    const scores = result.q_and_a.map(q => q.score)
    const avg =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0

    const saved = await saveSimulation(studentId, specialty, result.q_and_a, avg, {
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      overall_feedback: result.overall_feedback,
    })

    if (saved.error) {
      setErrorMsg(saved.error)
      setPhase("error")
      evaluatingRef.current = false
      return
    }

    setPhase("done")
    evaluatingRef.current = false
  }

  async function startInterview() {
    setPhase("requesting-mic")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
    } catch {
      setPhase("mic-error")
      return
    }

    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
    if (!agentId) {
      setErrorMsg("NEXT_PUBLIC_ELEVENLABS_AGENT_ID не настроен")
      setPhase("error")
      return
    }

    transcriptRef.current = []
    evaluatingRef.current = false
    setTurnCount(0)
    setEvaluation(null)
    setPhase("connecting")

    try {
      const conv = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",
        dynamicVariables: { specialty, language: locale },
        overrides: {
          agent: {
            prompt: { prompt: buildSkillyPrompt(specialty, locale) },
          },
        },
        onConnect: () => {
          phaseRef.current = "speaking"
          setPhase("speaking")
        },
        onDisconnect: (_details: DisconnectionDetails) => {
          conversationRef.current = null
          handleConversationEnd()
        },
        onMessage: ({ message, source }) => {
          transcriptRef.current.push({ role: source, message })
          if (source === "user") setTurnCount(c => c + 1)
        },
        onModeChange: ({ mode }) => {
          const p: Phase = mode === "speaking" ? "speaking" : "listening"
          phaseRef.current = p
          setPhase(p)
        },
        onError: (msg) => {
          setErrorMsg(typeof msg === "string" ? msg : "Ошибка соединения")
          setPhase("error")
        },
      })
      conversationRef.current = conv
    } catch {
      setErrorMsg("Не удалось подключиться к AI-интервьюеру")
      setPhase("error")
    }
  }

  async function endInterview() {
    const conv = conversationRef.current
    conversationRef.current = null
    try {
      if (conv) await conv.endSession()
    } catch {
      // Session already closed — endSession can throw if connection dropped
    }
  }

  const statusLabel: Partial<Record<Phase, string>> = {
    "requesting-mic": "Запрашиваю микрофон...",
    connecting:       "Подключение к AI-интервьюеру...",
    speaking:         "HR говорит...",
    listening:        "Говорите...",
    evaluating:       "Анализирую собеседование...",
    saving:           "Сохранение...",
  }

  const isActive = phase === "speaking" || phase === "listening"

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-8">
        <MorphingBlob phase="idle" />
        <div className="space-y-2">
          <h2 className="text-xl font-heading font-extrabold text-neutral-900">
            Симулятор собеседования
          </h2>
          <p className="text-sm text-neutral-500">
            Специальность:{" "}
            <strong className="text-neutral-800">{specialty}</strong>
          </p>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
            AI‑HR проведёт реальное голосовое собеседование. Говорите свободно
            — оценки и фидбэк появятся после завершения.
          </p>
        </div>
        <Button
          onClick={startInterview}
          className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-sm tracking-widest uppercase shadow-md shadow-blue-600/30 rounded-xl"
        >
          <Mic className="w-4 h-4 mr-2" />
          Начать интервью
        </Button>
      </div>
    )
  }

  // ── MIC ERROR ─────────────────────────────────────────────────────────────
  if (phase === "mic-error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <MicOff className="w-10 h-10 text-red-400" />
        <div className="space-y-1">
          <p className="text-sm font-heading font-bold text-neutral-800">
            Доступ к микрофону запрещён
          </p>
          <p className="text-xs text-neutral-500 max-w-xs">
            Разрешите доступ к микрофону в настройках браузера и обновите
            страницу.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setPhase("idle")}
          className="h-9 px-5 text-xs font-heading font-bold tracking-widest uppercase"
        >
          Назад
        </Button>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <XCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-600 font-heading font-bold">{errorMsg}</p>
        <Button
          variant="outline"
          onClick={() => { setPhase("idle"); setErrorMsg("") }}
          className="h-9 px-5 text-xs font-heading font-bold tracking-widest uppercase"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Попробовать снова
        </Button>
      </div>
    )
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (phase === "done" && evaluation) {
    const avg =
      evaluation.q_and_a.length > 0
        ? evaluation.q_and_a.reduce((s, q) => s + q.score, 0) / evaluation.q_and_a.length
        : 0

    return (
      <div className="space-y-6">
        {/* Score header */}
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-[11px] font-heading font-bold tracking-[0.2em] text-neutral-400 uppercase mb-2">
            Симуляция завершена
          </p>
          <p className="text-5xl font-heading font-extrabold text-neutral-900 leading-none">
            {avg.toFixed(1)}
            <span className="text-2xl text-neutral-400">/10</span>
          </p>
          <p className="text-sm text-neutral-500 mt-2">Средний балл</p>
        </div>

        {/* Final feedback */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase">
            Итоговый фидбэк HR
          </p>
          <p className="text-sm text-neutral-700 leading-relaxed">
            {evaluation.overall_feedback}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {evaluation.strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-heading font-bold text-emerald-600 tracking-widest uppercase mb-1.5">
                  Сильные стороны
                </p>
                <ul className="space-y-1">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold text-xs mt-0.5">✓</span>
                      <span className="text-xs text-neutral-600">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.weaknesses.length > 0 && (
              <div>
                <p className="text-[10px] font-heading font-bold text-red-500 tracking-widest uppercase mb-1.5">
                  Зоны роста
                </p>
                <ul className="space-y-1">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-red-400 font-bold text-xs mt-0.5">→</span>
                      <span className="text-xs text-neutral-600">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Q&A Accordion */}
        {evaluation.q_and_a.length > 0 && (
          <div>
            <p className="text-[11px] font-heading font-bold text-neutral-400 tracking-[0.18em] uppercase mb-3">
              Разбор вопросов
            </p>
            <Accordion type="multiple" className="space-y-2">
              {evaluation.q_and_a.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`q-${i}`}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-start justify-between gap-3 pr-2 w-full">
                      <p className="text-xs font-heading font-bold text-neutral-700 leading-snug text-left">
                        {item.question}
                      </p>
                      <span
                        className={`shrink-0 text-xl font-heading font-extrabold leading-none ${scoreColor(item.score)}`}
                      >
                        {item.score}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pb-1">
                      <p className="text-xs text-neutral-500 italic leading-relaxed">
                        «{item.answer}»
                      </p>
                      <div className="rounded-lg bg-white border border-neutral-200 p-3">
                        <p className="text-[10px] font-heading font-bold text-neutral-400 tracking-widest uppercase mb-1">
                          Комментарий HR
                        </p>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => { setEvaluation(null); setPhase("idle") }}
            variant="outline"
            className="flex-1 h-10 text-xs font-heading font-bold tracking-widest uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Повторить
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

  // ── ACTIVE / LOADING STATES ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Turn counter — visible during active voice session */}
      {isActive && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1 sm:gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-4 sm:w-6 rounded-full transition-all duration-300 ${
                  i < turnCount
                    ? "bg-blue-600"
                    : i === turnCount
                    ? "bg-blue-300"
                    : "bg-neutral-200"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-heading font-bold text-neutral-400 tracking-widest uppercase">
            {turnCount} реплик
          </span>
        </div>
      )}

      {/* Blob stage */}
      <div className="rounded-2xl bg-neutral-950 px-6 py-8 flex flex-col items-center gap-4">
        <MorphingBlob phase={phase} volume={volume} />

        <p className="text-xs font-heading font-bold text-white/60 tracking-widest uppercase">
          {statusLabel[phase] ?? ""}
        </p>

        {(phase === "evaluating" ||
          phase === "saving" ||
          phase === "connecting" ||
          phase === "requesting-mic") && (
          <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
        )}

        {/* Hang-up button — only during live interview */}
        {isActive && (
          <button
            onClick={endInterview}
            className="mt-1 flex items-center gap-2 h-10 px-5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-heading font-bold tracking-widest uppercase hover:bg-red-500/25 transition-all"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Завершить
          </button>
        )}
      </div>
    </div>
  )
}
