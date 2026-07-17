export type ReadinessLevel = "high" | "medium" | "low"

export type ProfileReadiness = {
  score: number
  level: ReadinessLevel
  label: string
  labelCls: string
  missing: string[]
}

export function calculateProfileReadiness({
  photoUrl,
  hasPortfolio,
  hasCertificates,
  isApproved,
  hasBasicFields,
}: {
  photoUrl?: string | null
  hasPortfolio: boolean
  hasCertificates: boolean
  isApproved: boolean
  hasBasicFields: boolean
}): ProfileReadiness {
  const checks = [
    { met: !!photoUrl,       hint: "Загрузите фото профиля" },
    { met: hasPortfolio,     hint: "Добавьте работы в портфолио" },
    { met: hasCertificates,  hint: "Загрузите сертификат" },
    { met: isApproved,       hint: "Дождитесь одобрения администратора" },
    { met: hasBasicFields,   hint: "Заполните ФИО, колледж, специальность, курс, телефон" },
  ]
  const score = checks.filter(c => c.met).length
  const missing = checks.filter(c => !c.met).map(c => c.hint)

  if (score >= 4) return { score, level: "high",   label: "Высокая готовность", labelCls: "text-emerald-700 border-emerald-300 bg-emerald-50",  missing }
  if (score >= 2) return { score, level: "medium",  label: "Средняя готовность",  labelCls: "text-amber-700 border-amber-300 bg-amber-50",         missing }
  return                 { score, level: "low",     label: "Низкая готовность",   labelCls: "text-neutral-500 border-neutral-200 bg-neutral-50",   missing }
}
