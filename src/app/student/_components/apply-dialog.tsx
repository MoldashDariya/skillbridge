"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { notifyEmployerOnApplication } from "@/app/actions/notifications"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const schema = z.object({ message: z.string().optional() })
type FormValues = z.infer<typeof schema>

export function ApplyDialog({ internshipId, internshipTitle, studentId }: {
  internshipId: string
  internshipTitle: string
  studentId: string
}) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState("")
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) { setServerError(""); reset() }
  }

  async function onSubmit(values: FormValues) {
    setServerError("")
    const supabase = createClient()
    const { error } = await supabase.from("applications").insert({
      internship_id: internshipId,
      student_id: studentId,
      message: values.message?.trim() || null,
    })
    if (error) {
      setServerError(error.code === "23505" ? "Вы уже подали заявку на эту практику" : error.message)
      return
    }
    notifyEmployerOnApplication(internshipId, studentId).catch(() => {})
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="w-full h-9 flex items-center justify-center gap-1.5 text-[11px] font-heading font-bold tracking-widest uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-blue-600/30">
          <Send className="w-3 h-3" />
          Подать заявку
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-white border-neutral-200 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 rounded-t-xl" />

        <DialogHeader className="pt-2">
          <DialogTitle className="font-heading text-[16px] font-bold tracking-wide text-neutral-900">
            Заявка на практику
          </DialogTitle>
          <p className="text-xs text-neutral-400 mt-0.5 truncate">{internshipTitle}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <label className="block text-[11px] font-heading font-bold tracking-[0.18em] text-neutral-500 uppercase mb-1.5">
              Сообщение{" "}
              <span className="text-neutral-400 normal-case tracking-normal font-normal">(необязательно)</span>
            </label>
            <textarea
              className="w-full min-h-[110px] resize-y rounded-md px-3 py-2 text-[14px] transition-colors bg-neutral-50 border border-neutral-200 hover:border-neutral-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 placeholder:text-neutral-400"
              placeholder="Расскажите немного о себе и почему вас интересует это место практики..."
              {...register("message")}
            />
          </div>

          {serverError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{serverError}</p>
          )}

          <div className="pt-1 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 h-10 border-neutral-200 hover:border-neutral-300 bg-white text-neutral-500 hover:text-neutral-700 font-heading text-xs tracking-widest uppercase"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs tracking-widest uppercase transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-blue-600/25"
            >
              {isSubmitting ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
