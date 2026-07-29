"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const schema = z.object({
  title: z.string().min(1, "Укажите название позиции"),
  specialty: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  places_count: z.string().optional(),
  deadline: z.string().optional(),
  format: z.enum(["internship", "traineeship", "production_practice"]).optional(),
  contact: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const inputCls = "h-10 bg-white border-neutral-200 hover:border-neutral-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/20 rounded-md text-[14px] placeholder:text-neutral-400 transition-colors shadow-sm"
const labelCls = "block text-[11px] font-heading font-bold tracking-[0.18em] text-neutral-500 uppercase mb-1.5"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

export function CreateInternshipDialog({ employerId }: { employerId: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    const supabase = createClient()
    const placesNum = values.places_count?.trim() ? parseInt(values.places_count, 10) : null
    const { error } = await supabase.from("internships").insert({
      employer_id: employerId,
      title: values.title,
      specialty: values.specialty || null,
      city: values.city || null,
      description: values.description || null,
      requirements: values.requirements || null,
      places_count: placesNum && !isNaN(placesNum) ? placesNum : null,
      deadline: values.deadline || null,
      format: values.format ?? null,
      contact: values.contact || null,
    })
    if (error) { console.error("Insert error:", error); return }
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs font-heading font-bold tracking-widest uppercase text-blue-700 hover:text-blue-800 border border-blue-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3 py-1.5 transition-all">
          <Plus className="w-3.5 h-3.5" />
          Добавить
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg bg-white border-neutral-200 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 rounded-t-xl" />

        <DialogHeader className="pt-2">
          <DialogTitle className="font-heading text-[17px] font-bold tracking-wide text-neutral-900">Новое место практики</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <label className={labelCls}>Название позиции *</label>
            <Input className={inputCls} placeholder="Frontend Developer" {...register("title")} />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <label className={labelCls}>Формат</label>
            <Controller
              control={control}
              name="format"
              render={({ field }) => (
                <Select value={(field.value as string) ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                  <SelectTrigger className={cn(inputCls, "w-full")}>
                    <SelectValue placeholder="Выберите формат" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-neutral-200 shadow-lg">
                    <SelectItem value="internship">Стажировка</SelectItem>
                    <SelectItem value="traineeship">Практика</SelectItem>
                    <SelectItem value="production_practice">Производственная практика</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Специальность</label>
              <Input className={inputCls} placeholder="IT technician" {...register("specialty")} />
            </div>
            <div>
              <label className={labelCls}>Город</label>
              <Input className={inputCls} placeholder="Алматы" {...register("city")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Мест</label>
              <Input className={inputCls} type="number" min={1} placeholder="3" {...register("places_count")} />
            </div>
            <div>
              <label className={labelCls}>Дедлайн</label>
              <Input className={cn(inputCls, "cursor-pointer")} type="date" {...register("deadline")} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Описание</label>
            <textarea
              className="w-full min-h-[80px] resize-y rounded-md px-3 py-2 text-[14px] transition-colors bg-white border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 placeholder:text-neutral-400 shadow-sm"
              placeholder="Расскажите о задачах стажёра..."
              {...register("description")}
            />
          </div>

          <div>
            <label className={labelCls}>Требования</label>
            <textarea
              className="w-full min-h-[60px] resize-y rounded-md px-3 py-2 text-[14px] transition-colors bg-white border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 placeholder:text-neutral-400 shadow-sm"
              placeholder="Базовые знания HTML/CSS, желание учиться..."
              {...register("requirements")}
            />
          </div>

          <div>
            <label className={labelCls}>Контакт</label>
            <Input className={inputCls} placeholder="+7 701 000 00 00 / hr@company.kz" {...register("contact")} />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 h-10 border-neutral-200 hover:border-neutral-300 bg-white text-neutral-500 hover:text-neutral-700 font-heading text-xs tracking-widest uppercase">
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs tracking-widest uppercase transition-all shadow-sm shadow-blue-600/25">
              {isSubmitting ? "Сохранение..." : "Опубликовать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
