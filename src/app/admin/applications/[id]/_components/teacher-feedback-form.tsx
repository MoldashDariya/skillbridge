"use client"

import { useState } from "react"
import { saveTeacherFeedback } from "@/app/admin/_actions"

export function TeacherFeedbackForm({ applicationId, initial }: { applicationId: string; initial: string | null }) {
  const [text, setText] = useState(initial ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")

  async function handleSave() {
    setSaving(true)
    setSaveError("")
    try {
      const result = await saveTeacherFeedback(applicationId, text)
      if (result.error) {
        setSaveError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setSaveError("Произошла ошибка. Попробуйте ещё раз.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-neutral-100 pt-4 space-y-3">
      <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
        Отзыв преподавателя
      </p>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); setSaveError("") }}
        rows={4}
        className="w-full resize-none rounded-lg px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors placeholder:text-neutral-400"
        placeholder="Оценка студента по итогам практики..."
      />
      {saveError && <p className="text-xs text-red-500">{saveError}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-[11px] font-heading font-bold tracking-widest uppercase px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
      >
        {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить отзыв"}
      </button>
    </div>
  )
}
