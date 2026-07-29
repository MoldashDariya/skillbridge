"use client"

import { useTranslation } from "@/contexts/language-context"
import type { Locale } from "@/lib/i18n"

const LABELS: Record<Locale, string> = {
  ru: "Рус",
  kz: "Қаз",
  en: "Eng",
}

export function LanguageSwitcher() {
  const { locale, setLocale, isPending } = useTranslation()

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5"
      aria-label="Выбор языка"
    >
      {(["ru", "kz", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          disabled={isPending}
          className={`px-2.5 py-1 rounded-md text-[11px] font-heading font-bold tracking-wide transition-all disabled:opacity-60 ${
            locale === l
              ? "bg-blue-600 text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-white"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
