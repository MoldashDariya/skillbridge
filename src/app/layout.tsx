import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"
import { LanguageProvider } from "@/contexts/language-context"
import { getDictionary, parseLocale } from "@/lib/i18n"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "SkillBridge KZ",
  description: "Платформа для поиска практики студентами колледжей Казахстана",
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const locale = parseLocale(cookieStore.get("lang")?.value)
  const dictionary = await getDictionary(locale)

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LanguageProvider locale={locale} dictionary={dictionary}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
