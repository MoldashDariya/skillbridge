"use client"

import { useState } from "react"
import { submitEmployerReview } from "@/app/student/_actions"

type ExistingReview = { rating: number; comment: string | null }

export function EmployerReviewForm({
  applicationId,
  employerId,
  existingReview,
}: {
  applicationId: string
  employerId: string
  existingReview: ExistingReview | null
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [comment, setComment] = useState(existingReview?.comment ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingReview)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!rating) return
    setSubmitting(true)
    setError("")
    const result = await submitEmployerReview(applicationId, employerId, rating, comment)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <div className="border-t border-neutral-100 pt-4 space-y-3">
      <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
        Оценить работодателя
      </p>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !submitted && setRating(star)}
            disabled={submitted}
            className={`text-2xl transition-colors leading-none ${
              star <= rating ? "text-amber-400" : submitted ? "text-neutral-200" : "text-neutral-200 hover:text-amber-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      {!submitted ? (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors placeholder:text-neutral-400"
            placeholder="Комментарий (необязательно)..."
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="text-[11px] font-heading font-bold tracking-widest uppercase px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all"
          >
            {submitting ? "Отправка..." : "Отправить отзыв"}
          </button>
        </>
      ) : (
        <>
          {comment && <p className="text-sm text-neutral-600 italic">«{comment}»</p>}
          <p className="text-[11px] font-heading font-bold text-emerald-600 tracking-widest uppercase">
            ✓ Отзыв отправлен
          </p>
        </>
      )}
    </div>
  )
}
