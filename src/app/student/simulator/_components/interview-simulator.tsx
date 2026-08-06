"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { SkillyMascot } from "@/components/skilly-mascot"
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
  if (language === "en") {
    return `You are Skilly, a friendly, encouraging, and professional AI interviewer — the official mascot of the SkillBridge platform for students in Kazakhstan.

SPECIALTY LOCK: You are interviewing ONLY for the position: "${specialty}".
Allowed specialties: Software Engineering (IT), Nursing, Catering (Chef), Construction.
NEVER mix professions. If specialty is Construction, NEVER ask about code. If Nursing, never ask about cooking.

OPENING — say exactly:
"Hi! I'm Skilly, the AI interviewer for SkillBridge. I'll be conducting a practice interview with you for ${specialty}. Let's begin!"

CONDUCT EXACTLY 6–7 QUESTIONS in this order:

STAGE 1 — Introduction (2 questions, NO professional jargon):
Q1: "Tell me a bit about yourself — who you are, where you're from, what you enjoy."
Q2: "Why did you choose ${specialty}? What attracted you to this field?"

STAGE 2 — Soft Skills (2 questions):
Q3: "How do you usually work in a team? Tell me about your experience collaborating with others."
Q4: "What do you do when you face something new or difficult you haven't encountered before?"

STAGE 3 — Professional Knowledge (generate 2 questions STRICTLY about ${specialty}):
- Software Engineering: programming languages, debugging, algorithms, version control, tools, projects
- Nursing: patient care, vital signs, clinical procedures, medical knowledge
- Catering (Chef): cooking techniques, food safety, HACCP, kitchen equipment, recipes
- Construction: building materials, safety regulations, tools, measurements, project workflow

STAGE 4 — Situational (1 question):
Describe a realistic problem scenario for ${specialty} and ask how the candidate would handle it.

RULES:
1. REACTION (REQUIRED): Before each question Q2–Q7, give a short natural reaction to the previous answer. Vary phrases: "Thanks!", "Great, let's continue.", "Interesting!", "Got it, that's important.", "Good, I heard you."
2. SHORT ANSWER: If the answer is very brief (under 2 sentences), ask once: "Could you tell me a bit more about that?"
3. UNKNOWN: If they say they don't know or aren't sure, respond EXACTLY: "No worries. This is a practice interview. Try to reason through it in your own words."
4. ONE QUESTION PER TURN: Never ask more than one question at once. Always wait for the answer.

CLOSING — after the candidate answers the final (6th or 7th) question, say EXACTLY:
"Thank you! The practice interview is complete. You did well. I'll now prepare some brief feedback and recommendations to help you feel more confident in a real interview."
Then end the conversation.

CRITICAL: Conduct the ENTIRE interview STRICTLY IN ENGLISH. Never switch languages.`
  }

  if (language === "kz") {
    return `Сен Скилли — SkillBridge платформасының AI-интервьюері және маскоты. Қазақстандағы студенттерге арналған платформаның ресми өкілісің.

МАМАНДЫҚ ШЕГІ: Сен тек "${specialty}" лауазымына үміткермен сұхбат жүргізесің.
Рұқсат етілген мамандықтар: Software Engineering (IT), Nursing (Медбике), Catering (Аспаз), Construction (Құрылысшы).
ЕШҚАШАН мамандықтарды араластырма. Егер Construction болса — код туралы СҰРАМА. Егер Nursing болса — тамақ туралы сұрама.

АШЫЛУ — дәлме-дәл айт:
"Сәлем! Мен Скилли — SkillBridge платформасының AI-интервьюері. Сенімен ${specialty} мамандығы бойынша оқу сұхбатын жүргіземін. Бастайық!"

ДӘЛМЕ-ДӘЛ 6–7 СҰРАҚ қой, осы ретпен:

1-КЕЗЕҢ — Таныстыру (2 сұрақ, кәсіби терминсіз):
С1: "Өзің туралы айтшы — кімсің, қайдансың, нені ұнататынсың?"
С2: "Неліктен ${specialty} мамандығын таңдадың? Бұл саланы не тартты?"

2-КЕЗЕҢ — Жұмсақ дағдылар (2 сұрақ):
С3: "Топта қалай жұмыс жасайсың? Бірлескен жұмыс тәжірибең туралы айт."
С4: "Жаңа немесе күрделі нәрсеге тап болғанда не жасайсың?"

3-КЕЗЕҢ — Кәсіби білім (${specialty} бойынша 2 сұрақ ойлап тап):
- Software Engineering: бағдарламалау тілдері, отладка, алгоритмдер, құралдар
- Nursing: науқасқа күтім, маңызды белгілер, клиникалық рәсімдер
- Catering (Аспаз): пісіру техникасы, тамақ қауіпсіздігі, HACCP
- Construction: материалдар, қауіпсіздік ережелері, құралдар, жұмыс кезеңдері

4-КЕЗЕҢ — Жағдайлық сұрақ (1 сұрақ):
${specialty} бойынша нақты проблемалық жағдай сипатта.

ЕРЕЖЕЛЕР:
1. РЕАКЦИЯ (МІНДЕТТІ): С2–С7 алдында алдыңғы жауапқа қысқаша жауап бер. Тіркестерді ауыстыр: "Рахмет!", "Жарайды, жалғасайық.", "Қызықты!", "Түсінікті.", "Жақсы, естідім."
2. ҚЫСҚА ЖАУАП: Жауап өте қысқа болса, бір рет: "Осы туралы толығырақ айта аласың ба?"
3. БІЛМЕЙДІ: Дәлме-дәл: "Ештеңе емес. Бұл оқу сұхбаты. Өз сөзіңмен пайымдап көр."
4. БІР СҰРАҚ: Бір кезекте бір ғана сұрақ қой. Жауапты күт.

ЖАБЫЛУ — соңғы (6-ші немесе 7-ші) сұраққа жауап алғаннан кейін дәлме-дәл:
"Рахмет! Оқу сұхбаты аяқталды. Сен жақсы жасадың. Қазір нақты сұхбатта өзіңді сенімдірек сезінуге көмектесетін қысқаша кері байланыс пен ұсыныстар дайындаймын."
Содан кейін сұхбатты аяқта.

МАҢЫЗДЫ: Тұтас сұхбатты тек ҚАЗАҚ ТІЛІНДЕ жүргіз. Тілді ешқашан ауыстырма.`
  }

  return `Ты Скилли — дружелюбный, поддерживающий и профессиональный AI-интервьюер, официальный маскот платформы SkillBridge для студентов Казахстана.

БЛОКИРОВКА СПЕЦИАЛЬНОСТИ: Ты проводишь собеседование ТОЛЬКО на позицию: "${specialty}".
Допустимые специальности: Software Engineering (IT), Nursing (Медсестра/Медик), Catering (Повар), Construction (Строитель).
НИКОГДА не смешивай профессии. Если специальность — Строитель, НИКОГДА не спрашивай про код. Если Медсестра — не спрашивай про готовку.

ВСТУПЛЕНИЕ — скажи ДОСЛОВНО:
"Привет! Меня зовут Скилли, я AI-интервьюер платформы SkillBridge. Я проведу с тобой тренировочное собеседование по специальности ${specialty}. Давай начнём!"

ЗАДАЙ РОВНО 6–7 ВОПРОСОВ в следующем порядке:

ЭТАП 1 — Знакомство (2 вопроса, БЕЗ профессиональных терминов):
В1: "Расскажи немного о себе — кто ты, откуда родом, чем увлекаешься?"
В2: "Почему ты выбрал специальность ${specialty}? Что тебя привлекло в этой профессии?"

ЭТАП 2 — Гибкие навыки / Мотивация (2 вопроса):
В3: "Как ты обычно работаешь в команде? Расскажи о своём опыте совместной работы."
В4: "Что ты делаешь, когда сталкиваешься с чем-то новым или сложным, с чем раньше не встречался?"

ЭТАП 3 — Профессиональные знания (придумай 2 вопроса СТРОГО по специальности ${specialty}):
- Software Engineering: языки программирования, отладка, алгоритмы, инструменты разработчика, контроль версий
- Nursing (Медицина): уход за пациентами, жизненные показатели, клинические процедуры, медицинские знания
- Catering (Повар): техники приготовления, пищевая безопасность, HACCP, кухонное оборудование
- Construction (Строитель): строительные материалы, техника безопасности, инструменты, измерения, этапы работ

ЭТАП 4 — Ситуационный вопрос (1 вопрос):
Опиши реалистичную проблемную ситуацию, характерную ТОЛЬКО для ${specialty}, и спроси как кандидат с ней справится.

ПРАВИЛА ПОВЕДЕНИЯ:
1. РЕАКЦИЯ (ОБЯЗАТЕЛЬНО): Перед каждым следующим вопросом (В2–В7) дай короткую естественную реакцию на предыдущий ответ. Используй разные фразы: "Спасибо за ответ!", "Отлично, давай продолжим.", "Интересно!", "Понятно, это важно.", "Хорошо, я услышал."
2. КОРОТКИЙ ОТВЕТ: Если ответ кандидата очень короткий (менее 2 предложений), один раз попроси: "Можешь немного подробнее рассказать об этом?"
3. НЕ ЗНАЮ: Если кандидат говорит что не знает или не уверен, ответь ДОСЛОВНО: "Ничего страшного. Это тренировочное собеседование. Попробуй рассуждать своими словами."
4. ОДИН ВОПРОС ЗА ХОД: Никогда не задавай более одного вопроса в одном сообщении. Жди ответа перед следующим вопросом.

ЗАВЕРШЕНИЕ — после ответа на последний (6-й или 7-й) вопрос скажи ДОСЛОВНО:
"Спасибо! Тренировочное собеседование завершено. Ты хорошо справился. Сейчас я подготовлю для тебя небольшую обратную связь и рекомендации, которые помогут увереннее пройти настоящее собеседование."
После этого заверши разговор.

ВАЖНО: Веди ВСЁ собеседование СТРОГО НА РУССКОМ ЯЗЫКЕ. Никогда не переходи на другой язык.`
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

  // Volume drives glow intensity — scaled 1.4× from original values
  const baseSize = isSpeaking ? 98 : isListening ? 98 : isThinking ? 84 : 56
  const dynSize = baseSize + volume * 70
  const baseAlpha = isSpeaking ? 0.55 : isListening ? 0.50 : isThinking ? 0.45 : 0.30
  const dynAlpha = Math.min(1, baseAlpha + volume * 0.4)

  const glow = isSpeaking
    ? `0 0 ${dynSize}px rgba(37,99,235,${dynAlpha}),0 0 ${dynSize * 2}px rgba(59,130,246,${dynAlpha * 0.5})`
    : isListening
    ? `0 0 ${dynSize}px rgba(5,150,105,${dynAlpha}),0 0 ${dynSize * 2}px rgba(16,185,129,${dynAlpha * 0.5})`
    : isThinking
    ? "0 0 84px rgba(124,58,237,0.65),0 0 168px rgba(139,92,246,0.28)"
    : "0 0 56px rgba(59,130,246,0.40),0 0 112px rgba(147,197,253,0.20)"

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
          width: 280,
          height: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 224,
            height: 224,
            background: orbA,
            borderRadius: "50%",
            filter: "blur(52px)",
            opacity: 0.4,
            animation: `orb-a ${dA} ease-in-out infinite`,
            transition: "background 0.6s",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 154,
            height: 154,
            background: orbB,
            borderRadius: "50%",
            filter: "blur(36px)",
            opacity: 0.38,
            animation: `orb-b ${dB} ease-in-out infinite`,
            transition: "background 0.6s",
          }}
        />
        <div
          style={{
            position: "relative",
            width: 180,
            height: 180,
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
            width: 124,
            height: 124,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <SkillyMascot className="w-36 h-36" />
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type Props = { studentId: string; specialty: string }

export function InterviewSimulator({ studentId, specialty }: Props) {
  const [phase, setPhase]               = useState<Phase>("idle")
  const [volume, setVolume]             = useState(0)
  const [turnCount, setTurnCount]       = useState(0)
  const [errorMsg, setErrorMsg]         = useState("")
  const [evaluation, setEvaluation]     = useState<EvaluationResult | null>(null)
  const [lastAIMessage, setLastAIMessage] = useState("")
  const [showLastQ, setShowLastQ]       = useState(false)

  const { locale } = useTranslation()

  const conversationRef  = useRef<Conversation | null>(null)
  const transcriptRef    = useRef<TranscriptEntry[]>([])
  const phaseRef         = useRef<Phase>("idle")
  const evaluatingRef    = useRef(false)
  const isMountedRef     = useRef(true)
  const userEndedRef     = useRef(false)
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
    const hasUserMessages = transcript.some(e => e.role === "user")

    if (!hasUserMessages) {
      const wasIntentional = userEndedRef.current
      userEndedRef.current = false
      evaluatingRef.current = false
      if (wasIntentional) {
        setPhase("idle")
      } else {
        setErrorMsg("Соединение с AI-интервьюером прервалось. Проверьте подключение и попробуйте снова.")
        setPhase("error")
      }
      return
    }

    userEndedRef.current = false
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
      improvements: result.improvements,
      confidence_score: result.confidence_score,
      completeness: result.completeness,
      recommendations: result.recommendations,
      overall_result: result.overall_result,
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
    transcriptRef.current = []
    evaluatingRef.current = false
    userEndedRef.current = false
    setTurnCount(0)
    setEvaluation(null)
    setLastAIMessage("")
    setShowLastQ(false)
    connectToElevenLabs()
  }

  async function connectToElevenLabs() {
    setPhase("connecting")

    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
    if (!agentId) {
      setErrorMsg("NEXT_PUBLIC_ELEVENLABS_AGENT_ID не настроен")
      setPhase("error")
      return
    }

    try {
      const conv = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",
        dynamicVariables: { specialty, language: locale },
        onConnect: () => {
          console.log("[Skilly] WebRTC connected — LiveKit room joined")
          phaseRef.current = "speaking"
          setPhase("speaking")
        },
        onDisconnect: (details: DisconnectionDetails) => {
          console.log("[Skilly] disconnected", details)
          conversationRef.current = null
          handleConversationEnd()
        },
        onMessage: ({ message, source }) => {
          transcriptRef.current.push({ role: source, message })
          if (source === "user") setTurnCount(c => c + 1)
          if (source === "ai") setLastAIMessage(message)
        },
        onModeChange: ({ mode }) => {
          const p: Phase = mode === "speaking" ? "speaking" : "listening"
          phaseRef.current = p
          setPhase(p)
        },
        onError: (msg) => {
          console.error("[Skilly] onError:", msg)
          setErrorMsg(typeof msg === "string" ? msg : "Ошибка соединения")
          setPhase("error")
        },
      })
      conversationRef.current = conv
    } catch (e) {
      console.error("[Skilly] startSession threw:", e)
      setErrorMsg("Не удалось подключиться к AI-интервьюеру")
      setPhase("error")
    }
  }

  async function endInterview() {
    userEndedRef.current = true
    phaseRef.current = "evaluating"
    setPhase("evaluating")
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
    connecting:       "Подключение к Скилли...",
    speaking:         "Скилли говорит...",
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
          Начать собеседование
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
          <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
            Для прохождения AI-собеседования разрешите доступ к микрофону в настройках браузера.
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
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center py-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-[11px] font-heading font-bold tracking-[0.2em] text-neutral-400 uppercase mb-2">
            Симуляция завершена
          </p>
          <p className="text-xl font-heading font-extrabold text-neutral-900 leading-snug max-w-xs mx-auto">
            {evaluation.overall_result}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center">
            <p className="text-2xl font-heading font-extrabold text-neutral-900 leading-none">
              {avg.toFixed(1)}<span className="text-base text-neutral-400">/10</span>
            </p>
            <p className="text-[9px] font-heading font-bold text-neutral-400 uppercase tracking-widest mt-1.5">
              Средний балл
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center">
            <p className="text-2xl font-heading font-extrabold text-blue-600 leading-none">
              {evaluation.confidence_score}
            </p>
            <p className="text-[9px] font-heading font-bold text-blue-400 uppercase tracking-widest mt-1.5">
              Уверенность
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
            <p className="text-2xl font-heading font-extrabold text-emerald-600 leading-none">
              {evaluation.completeness}
            </p>
            <p className="text-[9px] font-heading font-bold text-emerald-400 uppercase tracking-widest mt-1.5">
              Полнота
            </p>
          </div>
        </div>

        {/* Strengths / Improvements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <p className="text-[10px] font-heading font-bold text-emerald-600 tracking-widest uppercase mb-2">
              Сильные стороны
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed">{evaluation.strengths}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
            <p className="text-[10px] font-heading font-bold text-amber-600 tracking-widest uppercase mb-2">
              Зоны роста
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed">{evaluation.improvements}</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <p className="text-[10px] font-heading font-bold text-blue-600 tracking-widest uppercase mb-2">
            Рекомендации
          </p>
          <p className="text-sm text-neutral-700 leading-relaxed">{evaluation.recommendations}</p>
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
      {/* Turn counter + repeat button */}
      {isActive && (
        <div className="flex items-center justify-between gap-3">
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
          <span className="text-[11px] font-heading font-bold text-neutral-400 tracking-widest uppercase shrink-0">
            {turnCount} реплик
          </span>
        </div>
      )}

      {/* Last question display (toggle) */}
      {isActive && showLastQ && lastAIMessage && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-[10px] font-heading font-bold text-blue-500 tracking-widest uppercase mb-1">Вопрос Скилли</p>
          <p className="text-sm text-neutral-700 leading-relaxed">{lastAIMessage.replace(/\[[^\]]*\]/g, "").trim()}</p>
        </div>
      )}

      {/* Blob stage — light gradient background */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-blue-50/40 border border-neutral-100 px-6 py-8 flex flex-col items-center gap-4">
        <MorphingBlob phase={phase} volume={volume} />

        <p className="text-xs font-heading font-bold text-neutral-500 tracking-widest uppercase">
          {statusLabel[phase] ?? ""}
        </p>

        {(phase === "evaluating" ||
          phase === "saving" ||
          phase === "connecting" ||
          phase === "requesting-mic") && (
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        )}

        {/* Controls — only during live interview */}
        {isActive && (
          <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
            <button
              onClick={() => setShowLastQ(v => !v)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-neutral-200 text-neutral-500 text-[10px] font-heading font-bold tracking-widest uppercase hover:border-blue-300 hover:text-blue-600 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Повторить вопрос
            </button>
            <button
              onClick={endInterview}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-red-50 border border-red-200 text-red-500 text-[10px] font-heading font-bold tracking-widest uppercase hover:bg-red-100 transition-all"
            >
              <PhoneOff className="w-3 h-3" />
              Завершить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
