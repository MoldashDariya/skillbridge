"use client"

import { useRef, useState } from "react"
import { Upload, Loader2, FileText, Trash2, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function fileName(url: string) {
  try { return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url) } catch { return url }
}

export function EmployerDocsUpload({ userId, initialDocs }: { userId: string; initialDocs: string[] | null }) {
  const [docs, setDocs] = useState<string[]>(initialDocs ?? [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const oversized = files.find(f => f.size > 20 * 1024 * 1024)
    if (oversized) { setError("Каждый файл не должен превышать 20 МБ"); return }

    setError("")
    setUploading(true)
    const supabase = createClient()
    const uploaded: string[] = []

    for (const file of files) {
      const ext = file.name.split(".").pop()
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: err } = await supabase.storage.from("employer-docs").upload(path, file, { contentType: file.type })
      if (err) { setError(err.message); continue }
      const { data: { publicUrl } } = supabase.storage.from("employer-docs").getPublicUrl(path)
      uploaded.push(publicUrl)
    }

    if (uploaded.length > 0) {
      const newDocs = [...docs, ...uploaded]
      await supabase.from("employers").update({ document_urls: newDocs }).eq("user_id", userId)
      setDocs(newDocs)
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function removeDoc(url: string) {
    const supabase = createClient()
    try {
      const urlPath = new URL(url).pathname
      const storagePath = urlPath.split("/employer-docs/")[1]
      if (storagePath) await supabase.storage.from("employer-docs").remove([storagePath])
    } catch {}
    const newDocs = docs.filter(d => d !== url)
    await supabase.from("employers").update({ document_urls: newDocs.length > 0 ? newDocs : null }).eq("user_id", userId)
    setDocs(newDocs)
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.18em] uppercase mb-1">
        Документы компании
      </p>
      <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
        Загрузите свидетельство о регистрации ИП/ТОО и другие документы. Администратор колледжа рассмотрит их для подтверждения.
      </p>

      {/* Uploaded docs list */}
      {docs.length > 0 && (
        <div className="space-y-2 mb-4">
          {docs.map((url) => (
            <div key={url} className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
              <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="text-xs text-neutral-600 truncate flex-1">{fileName(url)}</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-blue-600 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button type="button" onClick={() => removeDoc(url)} className="text-neutral-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-[11px] font-heading font-bold tracking-widests uppercase px-4 py-2.5 rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-500 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all w-full justify-center disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? "Загрузка..." : "Добавить документ"}
      </button>

      {error && <p className="text-xs text-red-500 mt-3 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" multiple className="hidden" onChange={handleFiles} />
    </div>
  )
}
