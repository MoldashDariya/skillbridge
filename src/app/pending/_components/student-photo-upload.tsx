"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function StudentPhotoUpload({ userId, initialPhotoUrl }: { userId: string; initialPhotoUrl: string | null }) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { setError("Только изображения (JPG, PNG, WebP)"); return }
    if (file.size > 5 * 1024 * 1024) { setError("Файл не должен превышать 5 МБ"); return }

    setError("")
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${userId}/photo.${ext}`

    // Remove old photo if exists
    await supabase.storage.from("profile-photos").remove([`${userId}/photo.jpg`, `${userId}/photo.png`, `${userId}/photo.webp`, `${userId}/photo.jpeg`])

    const { error: storageErr } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true, contentType: file.type })
    if (storageErr) { setError(storageErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(path)

    await supabase.from("profiles").update({ photo_url: publicUrl }).eq("user_id", userId)
    setPhotoUrl(publicUrl)
    setUploading(false)
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.18em] uppercase mb-1">
        Фото для верификации
      </p>
      <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
        Администратор сверит фото с документом при первом визите. Загрузите чёткое фото лица.
      </p>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-20 h-20 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-all overflow-hidden shrink-0"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="Фото профиля" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-neutral-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1">
          {photoUrl ? (
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-heading font-bold tracking-widest uppercase">Фото загружено</span>
            </div>
          ) : (
            <p className="text-xs text-amber-600 font-heading font-bold tracking-widest uppercase mb-2">Фото не загружено</p>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-[11px] font-heading font-bold tracking-widests uppercase px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-50"
          >
            {photoUrl ? "Заменить фото" : "Выбрать фото"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  )
}
