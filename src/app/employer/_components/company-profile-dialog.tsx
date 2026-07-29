"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Loader2, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTranslation } from "@/contexts/language-context"

type FormValues = {
  company_description?: string
  city?: string
  contact_email?: string
  contact_phone?: string
}

const inputCls =
  "h-10 bg-white border-neutral-200 hover:border-neutral-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/20 rounded-md text-[14px] placeholder:text-neutral-400 transition-colors shadow-sm"
const labelCls =
  "block text-[11px] font-heading font-bold tracking-[0.18em] text-neutral-500 uppercase mb-1.5"

type Props = {
  employerId: string
  initial: {
    company_description: string | null
    city: string | null
    contact_email: string | null
    contact_phone: string | null
  }
}

export function CompanyProfileDialog({ employerId, initial }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState("")
  const router = useRouter()

  const schema = z.object({
    company_description: z.string().optional(),
    city: z.string().optional(),
    contact_email: z.string().email(t("employer.dialog_email_invalid") || "Invalid email").optional().or(z.literal("")),
    contact_phone: z.string().optional(),
  })

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_description: initial.company_description ?? "",
      city: initial.city ?? "",
      contact_email: initial.contact_email ?? "",
      contact_phone: initial.contact_phone ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const supabase = createClient()
    const { error } = await supabase
      .from("employers")
      .update({
        company_description: values.company_description?.trim() || null,
        city: values.city?.trim() || null,
        contact_email: values.contact_email?.trim() || null,
        contact_phone: values.contact_phone?.trim() || null,
      })
      .eq("id", employerId)

    if (error) { setServerError(error.message); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-[11px] font-heading font-bold tracking-widest uppercase text-blue-700 hover:text-blue-600 transition-colors">
          <Pencil className="w-3 h-3" /> {t("employer.edit_btn")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-extrabold text-[17px] text-neutral-900">
            {t("employer.company_profile")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <label className={labelCls}>{t("employer.dialog_about_company")}</label>
            <textarea
              className="w-full min-h-[80px] resize-y rounded-md px-3 py-2 text-[14px] bg-white border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 placeholder:text-neutral-400 shadow-sm transition-colors"
              placeholder={t("employer.dialog_about_placeholder")}
              {...register("company_description")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("employer.dialog_field_city")}</label>
              <Input className={inputCls} placeholder="Алматы" {...register("city")} />
            </div>
            <div>
              <label className={labelCls}>{t("employer.dialog_field_phone")}</label>
              <Input className={inputCls} placeholder="+7 701 000 00 00" {...register("contact_phone")} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <Input
              className={inputCls}
              type="email"
              placeholder="hr@company.kz"
              {...register("contact_email")}
            />
            {errors.contact_email && (
              <p className="text-xs text-red-500 mt-1">{errors.contact_email.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {serverError}
            </p>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs tracking-widest uppercase shadow-sm shadow-blue-600/25 transition-all"
            >
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t("employer.dialog_saving")}</>
              ) : (
                <><Check className="w-3.5 h-3.5 mr-1.5" />{t("common.save")}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
