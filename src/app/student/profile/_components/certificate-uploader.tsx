"use client"

import { useState, useRef } from "react"
import { Upload, Loader2, Trash2, FileText, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Database } from "@/types/supabase"

type Certificate = Database["public"]["Tables"]["student_certificates"]["Row"]

type Props = {
  userId: string
  studentId: string
  items: Certificate[]
}

const inputCls = "h-10 bg-white border-neutral-200 hover:border-neutral-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/20 rounded-md text-[14px] placeholder:text-neutral-400 transition-colors shadow-sm"
const labelCls = "block text-[11px] font-heading font-bold tracking-[0.18em] text-neutral-500 uppercase mb-1.5"

export function CertificateUploader({ userId, studentId, items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setError("")
  }

  async function handleUpload() {
    if (!file) { setError("Выберите файл"); return }
    setUploading(true)
    setError("")
    const supabase = createClient()

    const ext = file.name.split(".").pop()
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: storageError } = await supabase.storage
      .from("certificates")
      .upload(path, file, { contentType: file.type })

    if (storageError) { setError(storageError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from("certificates").getPublicUrl(path)

    const { data: cert, error: dbError } = await supabase
      .from("student_certificates")
      .insert({ student_id: studentId, file_url: publicUrl, title: title.trim() || null })
      .select()
      .single()

    if (dbError) { setError(dbError.message); setUploading(false); return }

    setItems(prev => [cert, ...prev])
    setFile(null)
    setTitle("")
    if (fileRef.current) fileRef.current.value = ""
    setUploading(false)
  }

  async function handleDelete(cert: Certificate) {
    setDeleting(cert.id)
    const supabase = createClient()
    try {
      const urlPath = new URL(cert.file_url).pathname
      const storagePath = urlPath.split("/certificates/")[1]
      if (storagePath) await supabase.storage.from("certificates").remove([storagePath])
    } catch { /* ignore URL parse errors */ }
    await supabase.from("student_certificates").delete().eq("id", cert.id)
    setItems(prev => prev.filter(i => i.id !== cert.id))
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-4 space-y-3">
        <p className="text-[11px] font-heading font-bold tracking-widests text-blue-700 uppercase">Добавить сертификат</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Название</label>
            <Input
              className={inputCls}
              placeholder="Сертификат по Python"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Файл (PDF, JPG, PNG)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="h-10 cursor-pointer flex items-center gap-2 px-3 rounded-md border border-neutral-200 bg-white hover:border-blue-400 transition-colors text-[14px] text-neutral-400 shadow-sm"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="truncate">{file ? file.name : "Выберите файл..."}</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        <Button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-heading font-bold text-xs tracking-widests uppercase shadow-sm shadow-blue-600/25"
        >
          {uploading
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Загрузка...</>
            : <><Upload className="w-3.5 h-3.5 mr-1.5" />Загрузить</>}
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map(cert => (
            <div key={cert.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-heading font-bold text-neutral-800 truncate">{cert.title ?? "Сертификат"}</p>
                  {cert.created_at && (
                    <p className="text-[11px] text-neutral-400">
                      {new Date(cert.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={cert.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-heading font-bold tracking-widests uppercase text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Открыть
                </a>
                <button
                  onClick={() => handleDelete(cert)}
                  disabled={deleting === cert.id}
                  className="text-neutral-300 hover:text-red-400 transition-colors"
                >
                  {deleting === cert.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-6 text-center">
          <p className="text-sm text-neutral-400">Нет загруженных сертификатов</p>
        </div>
      )}
    </div>
  )
}
