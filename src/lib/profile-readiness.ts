export type ReadinessLevel = "high" | "medium" | "low"

export type ProfileReadiness = {
  score: number
  level: ReadinessLevel
  label: string
  labelCls: string
  missing: string[]
}

const DEFAULT_LABELS = {
  high:             "Высокая готовность",
  medium:           "Средняя готовность",
  low:              "Низкая готовность",
  hint_photo:       "Загрузите фото профиля",
  hint_portfolio:   "Добавьте работы в портфолио",
  hint_certificate: "Загрузите сертификат",
  hint_approval:    "Дождитесь одобрения администратора",
  hint_basic_fields:"Заполните ФИО, колледж, специальность, курс, телефон",
}

export function calculateProfileReadiness({
  photoUrl,
  hasPortfolio,
  hasCertificates,
  isApproved,
  hasBasicFields,
  t,
}: {
  photoUrl?: string | null
  hasPortfolio: boolean
  hasCertificates: boolean
  isApproved: boolean
  hasBasicFields: boolean
  t?: (key: string) => string
}): ProfileReadiness {
  const tr = (key: string, fallback: string) => (t ? t(key) : fallback)

  const checks = [
    { met: !!photoUrl,       hint: tr("readiness.hint_photo",        DEFAULT_LABELS.hint_photo) },
    { met: hasPortfolio,     hint: tr("readiness.hint_portfolio",    DEFAULT_LABELS.hint_portfolio) },
    { met: hasCertificates,  hint: tr("readiness.hint_certificate",  DEFAULT_LABELS.hint_certificate) },
    { met: isApproved,       hint: tr("readiness.hint_approval",     DEFAULT_LABELS.hint_approval) },
    { met: hasBasicFields,   hint: tr("readiness.hint_basic_fields", DEFAULT_LABELS.hint_basic_fields) },
  ]
  const score = checks.filter(c => c.met).length
  const missing = checks.filter(c => !c.met).map(c => c.hint)

  if (score >= 4) return { score, level: "high",   label: tr("readiness.high",   DEFAULT_LABELS.high),   labelCls: "text-emerald-700 border-emerald-300 bg-emerald-50",  missing }
  if (score >= 2) return { score, level: "medium",  label: tr("readiness.medium", DEFAULT_LABELS.medium), labelCls: "text-amber-700 border-amber-300 bg-amber-50",         missing }
  return                 { score, level: "low",     label: tr("readiness.low",    DEFAULT_LABELS.low),    labelCls: "text-neutral-500 border-neutral-200 bg-neutral-50",   missing }
}
