import type ruDict from "@/dictionaries/ru.json"

export type Locale = "ru" | "kz" | "en"
export type Dictionary = typeof ruDict

export const LOCALES: Locale[] = ["ru", "kz", "en"]
export const DEFAULT_LOCALE: Locale = "ru"

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case "kz":
      return (await import("@/dictionaries/kz.json")).default as Dictionary
    case "en":
      return (await import("@/dictionaries/en.json")).default as Dictionary
    default:
      return (await import("@/dictionaries/ru.json")).default
  }
}

export function parseLocale(value: string | undefined): Locale {
  if (value && (LOCALES as string[]).includes(value)) return value as Locale
  return DEFAULT_LOCALE
}
