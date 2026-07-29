import Link from "next/link"
import Image from "next/image"
import { GraduationCap, Upload, Send, Building2, BarChart3, ArrowRight } from "lucide-react"

export const metadata = { title: "SkillBridge KZ — Практика для студентов колледжей Казахстана" }

const STEPS = [
  { icon: GraduationCap, n: "01", title: "Студент создаёт профиль",  body: "Указывает колледж, специальность и навыки" },
  { icon: Upload,        n: "02", title: "Загружает портфолио",       body: "Фотографии работ и проектов" },
  { icon: Send,          n: "03", title: "Подаёт заявку",             body: "Одна кнопка — мгновенная заявка" },
  { icon: Building2,     n: "04", title: "Работодатель выбирает",     body: "Изучает профили и портфолио студентов" },
  { icon: BarChart3,     n: "05", title: "Колледж отслеживает",       body: "Видит статистику и статусы заявок" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-blue-400">
      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-neutral-900 rounded-md flex items-center justify-center">
            <span className="text-blue-400 text-[9px] font-heading font-bold">SK</span>
          </div>
          <span className="text-sm font-heading font-bold tracking-wide text-neutral-900">SkillBridge KZ</span>
        </div>
        <Link
          href="/auth"
          className="text-xs text-neutral-900/60 hover:text-neutral-900 transition-colors font-heading tracking-widest uppercase"
        >
          Войти →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-24">
        <div className="inline-flex items-center gap-2 border border-neutral-900/20 bg-neutral-900/8 rounded-full px-3 py-1 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
          <span className="text-[11px] font-heading font-bold text-neutral-900 tracking-widest uppercase">
            Казахстан · 2025
          </span>
        </div>

        <h1 className="text-[clamp(3rem,10vw,6.5rem)] font-heading font-extrabold leading-[0.9] tracking-tight text-neutral-900 mb-6">
          Практика<br />
          для студентов<br />
          колледжей
        </h1>

        <p className="text-base text-neutral-900/60 max-w-md mb-10 leading-relaxed">
          Платформа для поиска практики студентами колледжей Казахстана.
          Подберите место, загрузите портфолио, подайте заявку в один клик.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 h-11 px-6 bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-heading font-bold tracking-widest uppercase rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Я студент <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center h-11 px-6 bg-white/40 hover:bg-white/60 text-neutral-900 border border-neutral-900/20 text-[13px] font-heading font-bold tracking-widest uppercase rounded-lg transition-all"
          >
            Я работодатель
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center h-11 px-6 text-neutral-900/50 hover:text-neutral-900 text-[13px] font-heading font-bold tracking-widest uppercase rounded-lg transition-colors"
          >
            Войти
          </Link>
        </div>

        <div className="flex items-center gap-3 mt-10">
          <Image src="/skilly-avatar.png" alt="Skilly AI Assistant" width={52} height={52} className="object-contain drop-shadow-md" />
          <div>
            <p className="text-[13px] font-heading font-bold text-neutral-900">Знакомьтесь — Skilly</p>
            <p className="text-[11px] text-neutral-900/55">Ваш AI-ассистент на платформе</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="relative pl-4 mb-12">
            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-400 rounded-full" />
            <p className="text-[11px] font-heading font-bold text-blue-600 tracking-[0.2em] uppercase mb-1">
              Принцип работы
            </p>
            <h2 className="text-2xl font-heading font-extrabold text-neutral-900">Как это работает</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {STEPS.map(({ icon: Icon, n, title, body }) => (
              <div
                key={n}
                className="group rounded-xl border border-neutral-200 bg-white p-5 hover:border-blue-400 hover:shadow-md hover:shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-200"
              >
                <p className="text-[10px] font-heading font-bold text-blue-400 tracking-widest mb-3">{n}</p>
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <p className="font-heading font-bold text-[13px] leading-snug text-neutral-900 mb-1">{title}</p>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="bg-blue-400 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-heading font-extrabold text-[18px] text-neutral-900 mb-1">Готовы начать?</p>
            <p className="text-xs text-neutral-900/50">Регистрация за 2 минуты.</p>
          </div>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 h-10 px-6 bg-neutral-900 hover:bg-neutral-800 text-white text-[12px] font-heading font-bold tracking-widest uppercase rounded-lg transition-all"
          >
            Зарегистрироваться <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
