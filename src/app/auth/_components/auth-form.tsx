"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SkillyMascot } from "@/components/skilly-mascot"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLE_REDIRECT: Record<string, string> = {
  student: "/student",
  employer: "/employer",
  college_admin: "/admin",
}

const COLLEGES = [
  "Талгарский Политехнический",
  "Талгарский колледж агробизнеса и менеджмента им.М.Бейсебаева",
  "Шелекский политехнический колледж",
] as const

const loginSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(6, "Минимум 6 символов"),
})

const registerSchema = z
  .object({
    firstName: z.string().min(1, "Укажите имя"),
    lastName: z.string().min(1, "Укажите фамилию"),
    email: z.string().email("Неверный формат email"),
    password: z.string().min(6, "Минимум 6 символов"),
    role: z.enum(["student", "employer"], {
      message: "Выберите роль",
    }),
    companyName: z.string().optional(),
    collegeName: z.string().optional(),
  })
  .refine(
    (d) => d.role !== "employer" || (d.companyName && d.companyName.trim().length > 0),
    { message: "Укажите название компании", path: ["companyName"] }
  )
  .refine(
    (d) => d.role !== "student" || (d.collegeName && d.collegeName.trim().length > 0),
    { message: "Выберите колледж", path: ["collegeName"] }
  )

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

const inputCls =
  "h-11 bg-white border-neutral-200 hover:border-neutral-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/20 rounded-md text-[15px] placeholder:text-neutral-400 transition-colors shadow-sm"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginValues) {
    setServerError("")
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (error) { setServerError(error.message); return }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, approval_status")
      .eq("user_id", data.user.id)
      .single()

    if (!profile) { setServerError("Профиль не найден. Обратитесь к администратору."); return }

    if (profile.approval_status === "pending" || profile.approval_status === "rejected") {
      router.push("/pending")
      router.refresh()
      return
    }

    router.push(ROLE_REDIRECT[profile.role ?? ""] ?? "/")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="stagger-2">
        <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
          Email
        </label>
        <Input className={inputCls} type="email" autoComplete="email" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="stagger-3">
        <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
          Пароль
        </label>
        <Input className={inputCls} type="password" autoComplete="current-password" {...register("password")} />
        <FieldError message={errors.password?.message} />
      </div>
      {serverError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {serverError}
        </p>
      )}
      <div className="stagger-4 pt-1">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-sm tracking-widest uppercase rounded-md transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-blue-600/25"
        >
          {isSubmitting ? "Вход..." : "Войти"}
        </Button>
      </div>
    </form>
  )
}

function RegisterForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    watch,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const selectedRole = watch("role")

  async function onSubmit(values: RegisterValues) {
    setServerError("")
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role: values.role,
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          company_name: values.companyName ?? "",
          college_name: values.collegeName ?? "",
        },
      },
    })
    if (error) { setServerError(error.message); return }
    if (!data.session) { setEmailSent(true); return }

    router.push(ROLE_REDIRECT[values.role])
    router.refresh()
  }

  if (emailSent) {
    return (
      <div className="py-10 text-center space-y-3 animate-fade-in">
        <div className="text-3xl">✉</div>
        <p className="font-heading font-bold text-lg">Проверьте почту</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Отправили ссылку для подтверждения аккаунта.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 stagger-2">
        <div>
          <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
            Имя
          </label>
          <Input className={inputCls} placeholder="Айгерим" autoComplete="given-name" {...register("firstName")} />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div>
          <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
            Фамилия
          </label>
          <Input className={inputCls} placeholder="Бекова" autoComplete="family-name" {...register("lastName")} />
          <FieldError message={errors.lastName?.message} />
        </div>
      </div>
      <div className="stagger-2">
        <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
          Email
        </label>
        <Input className={inputCls} type="email" autoComplete="email" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="stagger-3">
        <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
          Пароль
        </label>
        <Input className={inputCls} type="password" autoComplete="new-password" {...register("password")} />
        <FieldError message={errors.password?.message} />
      </div>
      <div className="stagger-4">
        <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
          Роль
        </label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              onValueChange={(v) => {
                field.onChange(v)
                resetField("companyName")
                resetField("collegeName")
              }}
              value={field.value ?? ""}
            >
              <SelectTrigger className={cn(inputCls, "w-full")}>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent className="bg-white border-neutral-200 shadow-lg">
                <SelectItem value="student">Студент</SelectItem>
                <SelectItem value="employer">Работодатель</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.role?.message} />
      </div>
      {selectedRole === "student" && (
        <div className="animate-slide-up">
          <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
            Колледж
          </label>
          <Controller
            control={control}
            name="collegeName"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger className={cn(inputCls, "w-full")}>
                  <SelectValue placeholder="Выберите колледж" />
                </SelectTrigger>
                <SelectContent className="bg-white border-neutral-200 shadow-lg">
                  {COLLEGES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.collegeName?.message} />
        </div>
      )}
      {selectedRole === "employer" && (
        <div className="animate-slide-up">
          <label className="block text-xs font-heading font-bold tracking-widest text-neutral-500 uppercase mb-1.5">
            Компания
          </label>
          <Input className={inputCls} {...register("companyName")} />
          <FieldError message={errors.companyName?.message} />
        </div>
      )}
      {serverError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {serverError}
        </p>
      )}
      <div className="stagger-5 pt-1">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-sm tracking-widest uppercase rounded-md transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-blue-600/25"
        >
          {isSubmitting ? "Регистрация..." : "Зарегистрироваться"}
        </Button>
      </div>
    </form>
  )
}

export default function AuthForm() {
  const [tab, setTab] = useState<"login" | "register">("login")

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-[390px] animate-slide-up">
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xl shadow-neutral-300/40">
          {/* Vivid amber top bar */}
          <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500" />

          <div className="px-8 pt-8 pb-9">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-7 stagger-1">
              <SkillyMascot className="w-10 h-10 shrink-0" />
              <div>
                <p className="text-[15px] font-heading font-bold leading-none tracking-wide text-neutral-900">
                  SkillBridge KZ
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Платформа для поиска практики</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-200 mb-7 stagger-1">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "pb-2.5 mr-6 text-xs font-heading font-bold tracking-[0.12em] uppercase transition-all border-b-2 -mb-px",
                    tab === t
                      ? "text-blue-600 border-blue-600"
                      : "text-neutral-400 border-transparent hover:text-neutral-600"
                  )}
                >
                  {t === "login" ? "Войти" : "Регистрация"}
                </button>
              ))}
            </div>

            {tab === "login" ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-400 mt-5">
          SkillBridge KZ · Талгар, Казахстан
        </p>
      </div>
    </div>
  )
}
