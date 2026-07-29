import type { Locale } from "@/lib/i18n"

// Common profanity patterns — English, Russian (Cyrillic), Kazakh
const BLOCKED: RegExp[] = [
  // English
  /\bf+u+c+k+/i,
  /\bsh+i+t+/i,
  /\bb+i+t+c+h+/i,
  /\ba+s+s+h+o+l+e+/i,
  /\bc+u+n+t+/i,
  /\bd+i+c+k+/i,
  /\bc+o+c+k+/i,
  /\bp+u+s+s+y+/i,
  /\bw+h+o+r+e+/i,
  /\bn+i+g+g+(a|er)/i,
  /\bfag\b/i,

  // Russian (мат)
  /блядь|блять|бляд/iu,
  /пизд/iu,
  /хуй|хуя|хуе|хуи/iu,
  /еб[аоёуи]|ёб[аоёуи]|еба[лн]|ёба[лн]/iu,
  /\bсука\b/iu,
  /мудак|мудил/iu,
  /шлюх/iu,
  /педик|пидор|педор/iu,
  /залуп/iu,
  /\bгандон\b/iu,
  /\bдрочи/iu,
  /\bеблан/iu,

  // Kazakh — \b doesn't match Cyrillic boundaries in JS, use plain patterns
  /сикен/iu,
  /сикіш/iu,
  /сика/iu,
  /боқ/iu,
]

const WARNINGS: Record<Locale, string> = {
  en: "Please use respectful language. I'm here to help you succeed!",
  kz: "Өтінеміз, сыпайы тілде сөйлесіңіз. Мен сізге көмектесуге даярмын!",
  ru: "Пожалуйста, общайтесь вежливо. Я здесь, чтобы помочь вам!",
}

export function containsProfanity(text: string): boolean {
  return BLOCKED.some((re) => re.test(text))
}

export function getProfanityWarning(locale: Locale): string {
  return WARNINGS[locale]
}
