"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Upload, Loader2, Trash2, ImageOff, X, ChevronLeft, ChevronRight, Video, Image } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/contexts/language-context"
import type { Database } from "@/types/supabase"

type PortfolioItem = Database["public"]["Tables"]["portfolio_items"]["Row"]

type FormValues = {
  title: string
  description?: string
}

const inputCls =
  "h-10 bg-white border-neutral-200 hover:border-neutral-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/20 rounded-md text-[14px] placeholder:text-neutral-400 transition-colors shadow-sm"
const labelCls =
  "block text-[11px] font-heading font-bold tracking-[0.18em] text-neutral-500 uppercase mb-1.5"

type Props = {
  userId: string
  studentId: string
  items: PortfolioItem[]
}

function isVideo(item: PortfolioItem) {
  return !!item.video_url && !item.image_url
}

export function PortfolioUploader({ userId, studentId, items: initialItems }: Props) {
  const { t } = useTranslation()
  const [items, setItems] = useState(initialItems)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<"image" | "video">("image")
  const [uploadMode, setUploadMode] = useState<"image" | "video">("image")
  const [uploadError, setUploadError] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prevItem = useCallback(() => setLightboxIndex(i => i !== null ? (i - 1 + items.length) % items.length : null), [items.length])
  const nextItem = useCallback(() => setLightboxIndex(i => i !== null ? (i + 1) % items.length : null), [items.length])

  const schema = z.object({
    title: z.string().min(1, t("profile.portfolio_title_required")),
    description: z.string().optional(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function switchMode(mode: "image" | "video") {
    setUploadMode(mode)
    setFile(null)
    setPreview(null)
    setUploadError("")
    if (fileRef.current) fileRef.current.value = ""
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setUploadError("")
    if (f) {
      setFileType(f.type.startsWith("video/") ? "video" : "image")
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  async function onSubmit(values: FormValues) {
    if (!file) { setUploadError(t("profile.error_select_file")); return }
    setUploadError("")
    const supabase = createClient()

    const ext = file.name.split(".").pop()
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: storageError } = await supabase.storage
      .from("portfolios")
      .upload(path, file, { contentType: file.type })

    if (storageError) { setUploadError(storageError.message); return }

    const { data: { publicUrl } } = supabase.storage.from("portfolios").getPublicUrl(path)

    const isVid = fileType === "video"
    const { data: newItem, error: dbError } = await supabase
      .from("portfolio_items")
      .insert({
        student_id: studentId,
        title: values.title,
        description: values.description?.trim() || null,
        image_url: isVid ? null : publicUrl,
        video_url: isVid ? publicUrl : null,
      })
      .select()
      .single()

    if (dbError) { setUploadError(dbError.message); return }

    setItems((prev) => [newItem, ...prev])
    reset()
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ""
    router.refresh()
  }

  async function deleteItem(item: PortfolioItem) {
    setDeleting(item.id)
    const supabase = createClient()

    const urlToRemove = item.image_url || item.video_url
    if (urlToRemove) {
      const urlPath = new URL(urlToRemove).pathname
      const storagePath = urlPath.split("/portfolios/")[1]
      if (storagePath) await supabase.storage.from("portfolios").remove([storagePath])
    }

    await supabase.from("portfolio_items").delete().eq("id", item.id)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    setDeleting(null)
    router.refresh()
  }

  const accept = uploadMode === "video"
    ? "video/mp4,video/webm,video/quicktime,video/x-msvideo"
    : "image/jpeg,image/png,image/webp,image/gif"

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-heading font-bold tracking-widest text-blue-700 uppercase">{t("profile.portfolio_add")}</p>
          {/* Image / Video toggle */}
          <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => switchMode("image")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-heading font-bold tracking-widests uppercase transition-colors ${uploadMode === "image" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-600"}`}
            >
              <Image className="w-3 h-3" />{t("profile.portfolio_photo")}
            </button>
            <button
              type="button"
              onClick={() => switchMode("video")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-heading font-bold tracking-widests uppercase transition-colors ${uploadMode === "video" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-600"}`}
            >
              <Video className="w-3 h-3" />{t("profile.portfolio_video")}
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-lg border border-neutral-200 bg-white hover:border-blue-400 transition-colors overflow-hidden"
        >
          {preview ? (
            uploadMode === "video" || fileType === "video" ? (
              <video src={preview} className="w-full h-48 object-cover" muted />
            ) : (
              <img src={preview} alt="preview" className="w-full h-48 object-cover" />
            )
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-blue-600 transition-colors">
              {uploadMode === "video" ? <Video className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              <span className="text-xs font-heading tracking-widests uppercase">
                {uploadMode === "video" ? t("profile.portfolio_select_video") : t("profile.portfolio_select_image")}
              </span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("profile.portfolio_field_title")}</label>
            <Input className={inputCls} placeholder={t("profile.portfolio_title_placeholder")} {...register("title")} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className={labelCls}>{t("profile.portfolio_field_desc")}</label>
            <Input className={inputCls} placeholder={t("profile.portfolio_desc_placeholder")} {...register("description")} />
          </div>
        </div>

        {uploadError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{uploadError}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !file}
          className="h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-heading font-bold text-xs tracking-widests uppercase shadow-sm shadow-blue-600/25 transition-all"
        >
          {isSubmitting ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t("profile.uploading")}</>
          ) : (
            <><Upload className="w-3.5 h-3.5 mr-1.5" />{t("profile.upload_btn")}</>
          )}
        </Button>
      </form>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center">
          <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center mx-auto mb-3">
            <ImageOff className="w-5 h-5 text-neutral-300" />
          </div>
          <p className="text-sm text-neutral-400">{t("profile.portfolio_empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, idx) => {
            const vid = isVideo(item)
            return (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-white aspect-square"
              >
                {vid ? (
                  <video
                    src={item.video_url ?? ""}
                    className="w-full h-full object-cover cursor-pointer"
                    muted
                    onClick={() => setLightboxIndex(idx)}
                    onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                    onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0 }}
                  />
                ) : item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setLightboxIndex(idx)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-50">
                    <ImageOff className="w-6 h-6 text-neutral-300" />
                  </div>
                )}
                {vid && (
                  <div className="absolute top-2 left-2 bg-black/50 rounded-md px-1.5 py-0.5 flex items-center gap-1 pointer-events-none">
                    <Video className="w-2.5 h-2.5 text-white" />
                    <span className="text-[9px] text-white font-heading font-bold uppercase">{t("profile.portfolio_video_badge")}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start justify-end p-3 pointer-events-none">
                  <p className="text-white text-xs font-heading font-bold truncate w-full">{item.title}</p>
                  {item.description && (
                    <p className="text-white/70 text-[11px] truncate w-full mt-0.5">{item.description}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteItem(item)}
                  disabled={deleting === item.id}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-red-300 hover:text-red-200 font-heading tracking-widests uppercase bg-black/40 rounded px-1.5 py-1"
                >
                  {deleting === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && items[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          {items.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevItem() }} className="absolute left-4 text-white/70 hover:text-white p-2">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextItem() }} className="absolute right-4 text-white/70 hover:text-white p-2">
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}
          <div className="max-w-3xl max-h-[90vh] px-16 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {isVideo(items[lightboxIndex]) ? (
              <video
                src={items[lightboxIndex].video_url ?? ""}
                className="max-h-[75vh] max-w-full rounded-lg"
                controls
                autoPlay
              />
            ) : (
              <img
                src={items[lightboxIndex].image_url ?? ""}
                alt={items[lightboxIndex].title}
                className="max-h-[75vh] max-w-full object-contain rounded-lg"
              />
            )}
            <div className="text-center">
              <p className="text-white font-heading font-bold text-sm">{items[lightboxIndex].title}</p>
              {items[lightboxIndex].description && (
                <p className="text-white/60 text-xs mt-1">{items[lightboxIndex].description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
