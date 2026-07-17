"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Loader2 } from "lucide-react"
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

const COLLEGES = [
  "Талгарский Политехнический",
  "Талгарский колледж агробизнеса и менеджмента им.М.Бейсебаева",
  "Шелекский политехнический колледж",
] as const

const schema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  college_name: z.string().min(1, "Укажите колледж"),
  specialty: z.string().optional(),
  course_year: z.string().optional(),
  bio: z.string().optional(),
  skills: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  userId: string
  studentId: string
  initial: FormValues
}

const inputCls =
  "h-10 bg-white border-neutral-200 hover:border-neutral-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/20 rounded-md text-[14px] placeholder:text-neutral-400 transition-colors shadow-sm"
const labelCls =
  "block text-[11px] font-heading font-bold tracking-[0.18em] text-neutral-500 uppercase mb-1.5"

export function ProfileForm({ userId, studentId, initial }: Props) {
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState("")
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial })

  async function onSubmit(values: FormValues) {
    setServerError("")
    setSaved(false)
    const supabase = createClient()

    const courseNum = values.course_year?.trim()
      ? parseInt(values.course_year, 10)
      : null

    const skillsArr = values.skills
      ? values.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const [profileRes, studentRes] = await Promise.all([
      supabase
        .from("profiles")
        .update({
          first_name: values.first_name?.trim() || null,
          last_name: values.last_name?.trim() || null,
          phone: values.phone?.trim() || null,
          city: values.city?.trim() || null,
        })
        .eq("user_id", userId),
      supabase
        .from("students")
        .update({
          college_name: values.college_name?.trim() || null,
          specialty: values.specialty?.trim() || null,
          course_year: courseNum && !isNaN(courseNum) ? courseNum : null,
          bio: values.bio?.trim() || null,
          skills: skillsArr.length > 0 ? skillsArr : null,
        })
        .eq("id", studentId),
    ])

    if (profileRes.error || studentRes.error) {
      setServerError(profileRes.error?.message ?? studentRes.error?.message ?? "Ошибка сохранения")
      return
    }

    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Personal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Имя</label>
          <Input className={inputCls} placeholder="Дарын" {...register("first_name")} />
        </div>
        <div>
          <label className={labelCls}>Фамилия</label>
          <Input className={inputCls} placeholder="Молдаш" {...register("last_name")} />
        </div>
        <div>
          <label className={labelCls}>Телефон</label>
          <Input className={inputCls} placeholder="+7 701 000 00 00" {...register("phone")} />
        </div>
        <div>
          <label className={labelCls}>Город</label>
          <Input className={inputCls} placeholder="Талгар" {...register("city")} />
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Колледж <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <Controller
            control={control}
            name="college_name"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger className={inputCls}>
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
          {errors.college_name && (
            <p className="text-xs text-red-500 mt-1">{errors.college_name.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Специальность</label>
          <Input className={inputCls} placeholder="IT technician" {...register("specialty")} />
        </div>
        <div>
          <label className={labelCls}>Курс</label>
          <Input className={inputCls} type="number" min={1} max={4} placeholder="2" {...register("course_year")} />
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-5">
        <div className="mb-4">
          <label className={labelCls}>О себе</label>
          <textarea
            className="w-full min-h-[80px] resize-y rounded-md px-3 py-2 text-[14px] bg-white border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 placeholder:text-neutral-400 shadow-sm transition-colors"
            placeholder="Коротко о себе и своих целях..."
            {...register("bio")}
          />
        </div>
        <div>
          <label className={labelCls}>
            Навыки{" "}
            <span className="normal-case text-neutral-400 tracking-normal font-normal">
              (через запятую)
            </span>
          </label>
          <Input
            className={inputCls}
            placeholder="HTML, CSS, Figma, Excel"
            {...register("skills")}
          />
        </div>
      </div>

      {serverError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {serverError}
        </p>
      )}

      <div className="pt-2 flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs tracking-widest uppercase transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-blue-600/25"
        >
          {isSubmitting ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Сохранение...</>
          ) : (
            "Сохранить"
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-heading font-bold tracking-widest uppercase animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            Сохранено
          </span>
        )}
      </div>
    </form>
  )
}
