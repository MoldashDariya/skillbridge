"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useTransition,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import type { Dictionary, Locale } from "@/lib/i18n"

type LanguageContextValue = {
  locale: Locale
  t: (key: string) => string
  setLocale: (locale: Locale) => void
  isPending: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function resolveDotKey(dict: Dictionary, key: string): string {
  const parts = key.split(".")
  let current: unknown = dict
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as object)) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return key
    }
  }
  return typeof current === "string" ? current : key
}

export function LanguageProvider({
  children,
  locale: initialLocale,
  dictionary: initialDict,
}: {
  children: ReactNode
  locale: Locale
  dictionary: Dictionary
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [dict, setDict] = useState<Dictionary>(initialDict)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return
      startTransition(async () => {
        const { getDictionary } = await import("@/lib/i18n")
        const nextDict = await getDictionary(next)
        setLocaleState(next)
        setDict(nextDict)
        document.cookie = `lang=${next}; path=/; max-age=31536000; SameSite=Lax`
        router.refresh()
      })
    },
    [locale, router],
  )

  const t = useCallback(
    (key: string) => resolveDotKey(dict, key),
    [dict],
  )

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale, isPending }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useTranslation must be used inside LanguageProvider")
  return ctx
}
