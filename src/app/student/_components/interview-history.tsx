"use client"

import { useState } from "react"
import { Mic, ChevronDown } from "lucide-react"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"

export type SimRow = {
  id: string
  specialty: string
  average_score: number | null
  created_at: string | null
  q_and_a: { question: string; answer: string; score: number; explanation: string }[]
  final_feedback: { strengths: string[]; weaknesses: string[]; overall_feedback: string } | null
}

export function InterviewHistory({ simulations }: { simulations: SimRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (simulations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3">
          <Mic className="w-5 h-5 text-blue-400" />
        </div>
        <p className="font-heading font-bold text-[15px] mb-1 text-neutral-500">Нет пройденных собеседований</p>
        <p className="text-xs text-neutral-400">Пройдите симулятор, чтобы увидеть историю результатов</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {simulations.map((sim) => {
        const isOpen = openId === sim.id
        const score = sim.average_score !== null ? Number(sim.average_score).toFixed(1) : null
        const scoreCls = score !== null
          ? Number(score) >= 8
            ? "text-emerald-600 border-emerald-300 bg-emerald-50"
            : Number(score) >= 5
            ? "text-amber-600 border-amber-300 bg-amber-50"
            : "text-red-600 border-red-300 bg-red-50"
          : "text-neutral-500 border-neutral-200 bg-neutral-50"

        return (
          <div key={sim.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => setOpenId(isOpen ? null : sim.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-neutral-50/80 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-heading font-bold text-neutral-800 truncate">{sim.specialty}</p>
                {sim.created_at && (
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {new Date(sim.created_at).toLocaleDateString("ru-RU", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {score !== null && (
                  <span className={`text-[13px] font-heading font-extrabold px-2.5 py-0.5 rounded-full border ${scoreCls}`}>
                    {score}<span className="font-normal text-[10px] opacity-60"> / 10</span>
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-neutral-100 px-4 py-4 space-y-4">
                {sim.final_feedback && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-heading font-bold text-blue-600 tracking-widest uppercase">
                      Итоговый фидбэк
                    </p>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {sim.final_feedback.overall_feedback}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {sim.final_feedback.strengths.length > 0 && (
                        <div>
                          <p className="text-[9px] font-heading font-bold text-emerald-600 tracking-widest uppercase mb-1.5">
                            Сильные стороны
                          </p>
                          <ul className="space-y-1">
                            {sim.final_feedback.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 text-[10px] font-bold mt-0.5 shrink-0">✓</span>
                                <span className="text-[11px] text-neutral-600">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {sim.final_feedback.weaknesses.length > 0 && (
                        <div>
                          <p className="text-[9px] font-heading font-bold text-red-500 tracking-widest uppercase mb-1.5">
                            Зоны роста
                          </p>
                          <ul className="space-y-1">
                            {sim.final_feedback.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-red-400 text-[10px] font-bold mt-0.5 shrink-0">→</span>
                                <span className="text-[11px] text-neutral-600">{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {sim.q_and_a.length > 0 && (
                  <div className={sim.final_feedback ? "border-t border-neutral-100 pt-4" : ""}>
                    <p className="text-[10px] font-heading font-bold text-neutral-400 tracking-widest uppercase mb-2.5">
                      Разбор вопросов
                    </p>
                    <Accordion type="multiple" className="space-y-1.5">
                      {sim.q_and_a.map((item, i) => (
                        <AccordionItem
                          key={i}
                          value={`q-${sim.id}-${i}`}
                          className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 overflow-hidden"
                        >
                          <AccordionTrigger className="hover:no-underline py-2">
                            <div className="flex items-start justify-between gap-2 pr-1 w-full">
                              <p className="text-[11px] text-neutral-600 leading-snug text-left">
                                {item.question}
                              </p>
                              <span
                                className={`shrink-0 text-sm font-heading font-bold ${
                                  item.score >= 8
                                    ? "text-emerald-500"
                                    : item.score >= 5
                                    ? "text-amber-500"
                                    : "text-red-500"
                                }`}
                              >
                                {item.score}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1.5 pb-1">
                              <p className="text-[11px] text-neutral-400 italic">«{item.answer}»</p>
                              {item.explanation && (
                                <p className="text-[11px] text-neutral-500 leading-relaxed bg-white rounded p-2 border border-neutral-100">
                                  {item.explanation}
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
