"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { generateResumeData } from "../_actions"
import type { ResumeData } from "../_actions"
import { ResumeTemplate } from "./resume-template"
import { useTranslation } from "@/contexts/language-context"

type Phase = "idle" | "ai" | "pdf" | "done" | "error"

export function ResumeDownloadButton({
  studentId,
  disabled,
}: {
  studentId: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const templateRef = useRef<HTMLDivElement>(null)
  const tRef = useRef(t)
  tRef.current = t

  useEffect(() => {
    if (phase !== "pdf" || !resumeData) return

    let cancelled = false

    void (async () => {
      // Let React flush the template into the DOM before we capture it
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const el = templateRef.current
      if (!el || cancelled) return

      try {
        // html2pdf.js has no bundled types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { default: html2pdf } = await import("html2pdf.js") as { default: any }

        await html2pdf()
          .set({
            margin: 0,
            filename: `Resume_${resumeData.name.replace(/\s+/g, "_")}.pdf`,
            html2canvas: {
              scale: 4,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff",
              // Strip the page's Tailwind v4 CSS (which uses oklch) from the
              // cloned document so html2canvas never tries to parse oklch().
              // The template uses only inline styles, so this has no visual effect.
              onclone: (_clonedDoc: Document, clonedEl: HTMLElement) => {
                const root = clonedEl.ownerDocument ?? _clonedDoc
                root
                  .querySelectorAll('style, link[rel="stylesheet"]')
                  .forEach((node) => node.remove())
              },
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .from(el)
          .save()

        if (!cancelled) {
          setPhase("done")
          setTimeout(() => setPhase("idle"), 3000)
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            tRef.current("resume.error_pdf_prefix") +
              (err instanceof Error ? err.message : tRef.current("resume.error_pdf_fallback"))
          )
          setPhase("error")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [phase, resumeData])

  async function handleDownload() {
    if (disabled || phase === "ai" || phase === "pdf") return
    setPhase("ai")
    setErrorMsg("")

    const result = await generateResumeData(studentId)
    if (result.error || !result.data) {
      setErrorMsg(result.error ?? t("resume.error_generation"))
      setPhase("error")
      return
    }

    setResumeData(result.data)
    setPhase("pdf")
  }

  const isLoading = phase === "ai" || phase === "pdf"

  return (
    <>
      {/* Off-screen template — in DOM so html2pdf can capture it */}
      {resumeData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            width: "794px",
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          <div ref={templateRef}>
            <ResumeTemplate data={resumeData} />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase">
                AI Resume Builder
              </p>
              <span className="text-[9px] font-heading font-bold text-blue-500 border border-blue-300 bg-blue-100 px-1.5 py-0.5 rounded-full tracking-widest uppercase">
                Beta
              </span>
            </div>
            <p className="text-sm font-heading font-bold text-neutral-900">
              {t("resume.title")}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              {phase === "error" ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 inline shrink-0" />
                  {errorMsg}
                </span>
              ) : phase === "done" ? (
                <span className="text-emerald-600">{t("resume.saved")}</span>
              ) : (
                t("resume.subtitle")
              )}
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={isLoading || disabled}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-heading font-bold tracking-wide hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {phase === "done" ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t("resume.btn_done")}
              </>
            ) : phase === "ai" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("resume.btn_generating")}
              </>
            ) : phase === "pdf" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("resume.btn_creating")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t("resume.btn_download")}
              </>
            )}
          </button>
        </div>

        {phase === "error" && (
          <button
            onClick={() => setPhase("idle")}
            className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-600 font-heading font-bold tracking-widest uppercase transition-colors"
          >
            {t("resume.retry")}
          </button>
        )}
      </div>
    </>
  )
}
