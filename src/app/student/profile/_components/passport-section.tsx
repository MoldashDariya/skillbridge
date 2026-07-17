"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CertificateUploader } from "./certificate-uploader"
import type { Database } from "@/types/supabase"

type Certificate = Database["public"]["Tables"]["student_certificates"]["Row"]

const urlOrEmpty = z.string().refine(
  v => v === "" || /^https?:\/\/.+/.test(v),
  { message: "Введите корректный URL (https://...)" }
)

const schema = z.object({
  gpa: z.string().optional(),
  github_url: urlOrEmpty.optional(),
  linkedin_url: urlOrEmpty.optional(),
  behance_url: urlOrEmpty.optional(),
  dribbble_url: urlOrEmpty.optional(),
  figma_url: urlOrEmpty.optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  userId: string
  studentId: string
  initial: FormValues
  certificates: Certificate[]
}

const inputCls = "h-10 bg-white border-neutral-200 hover:border-neutral-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/20 rounded-md text-[14px] placeholder:text-neutral-400 transition-colors shadow-sm"
const labelCls = "block text-[11px] font-heading font-bold tracking-[0.18em] text-neutral-500 uppercase mb-1.5"

const LINK_FIELDS = [
  { name: "github_url"   as const, label: "GitHub",   placeholder: "https://github.com/username" },
  { name: "linkedin_url" as const, label: "LinkedIn",  placeholder: "https://linkedin.com/in/username" },
  { name: "behance_url"  as const, label: "Behance",   placeholder: "https://behance.net/username" },
  { name: "dribbble_url" as const, label: "Dribbble",  placeholder: "https://dribbble.com/username" },
  { name: "figma_url"    as const, label: "Figma",     placeholder: "https://figma.com/@username" },
]

export function PassportSection({ userId, studentId, initial, certificates }: Props) {
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial })

  async function onSubmit(values: FormValues) {
    setServerError("")
    setSaved(false)
    const supabase = createClient()

    const gpaNum = values.gpa?.trim() ? parseFloat(values.gpa) : null

    const { error } = await supabase
      .from("students")
      .update({
        gpa: gpaNum !== null && !isNaN(gpaNum) ? gpaNum : null,
        github_url:   values.github_url?.trim()   || null,
        linkedin_url: values.linkedin_url?.trim()  || null,
        behance_url:  values.behance_url?.trim()   || null,
        dribbble_url: values.dribbble_url?.trim()  || null,
        figma_url:    values.figma_url?.trim()     || null,
      })
      .eq("id", studentId)

    if (error) { setServerError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* GPA */}
        <div className="max-w-[180px]">
          <label className={labelCls}>GPA</label>
          <Input
            className={inputCls}
            type="number"
            min="0"
            max="5"
            step="0.01"
            placeholder="4.50"
            {...register("gpa")}
          />
          <p className="text-[11px] text-neutral-400 mt-1">Шкала 0.00 — 5.00</p>
        </div>

        {/* External links */}
        <div className="border-t border-neutral-100 pt-5">
          <p className={`${labelCls} mb-3`}>Внешние ссылки</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LINK_FIELDS.map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className={labelCls}>{label}</label>
                <Input className={inputCls} placeholder={placeholder} {...register(name)} />
                {errors[name] && (
                  <p className="text-xs text-red-500 mt-1">{errors[name]?.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {serverError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {serverError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs tracking-widests uppercase transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-blue-600/25"
          >
            {isSubmitting
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Сохранение...</>
              : "Сохранить"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-heading font-bold tracking-widests uppercase animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              Сохранено
            </span>
          )}
        </div>
      </form>

      {/* Certificates */}
      <div className="border-t border-neutral-100 pt-5">
        <p className={`${labelCls} mb-3`}>Сертификаты</p>
        <CertificateUploader userId={userId} studentId={studentId} items={certificates} />
      </div>
    </div>
  )
}
