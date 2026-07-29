import { cookies } from "next/headers"
import { getDictionary, parseLocale } from "./i18n"
import type { Dictionary } from "./i18n"

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

export async function getPageT(): Promise<(key: string) => string> {
  const cookieStore = await cookies()
  const locale = parseLocale(cookieStore.get("lang")?.value)
  const dict = await getDictionary(locale)
  return (key: string) => resolveDotKey(dict, key)
}
