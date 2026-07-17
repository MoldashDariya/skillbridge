"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { SlidersHorizontal } from "lucide-react"

type Props = {
  specialties: string[]
  current: string
}

export function SpecialtyFilter({ specialties, current }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("specialty", value)
    else params.delete("specialty")
    params.delete("tab")
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white text-neutral-700 focus:outline-none focus:border-blue-400 hover:border-neutral-300 transition-colors"
      >
        <option value="">Все специальности</option>
        {specialties.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
