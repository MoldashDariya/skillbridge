"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { uploadCollegeRoster, type RosterItem } from "../_actions"

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; count: number }
  | { type: "error"; message: string }

function normalizeHeader(h: string) {
  return h.toLowerCase().trim().replace(/[\s\-\/]+/g, "")
}

const COL_MAP: Record<string, keyof RosterItem> = {
  фио: "full_name",
  fullname: "full_name",
  name: "full_name",
  имя: "full_name",
  иин: "identifier",
  iin: "identifier",
  identifier: "identifier",
  ид: "identifier",
  id: "identifier",
  studentid: "identifier",
  идентификатор: "identifier",
  номер: "identifier",
  специальность: "specialty",
  specialty: "specialty",
  группа: "group_name",
  group: "group_name",
  groupname: "group_name",
  группакласс: "group_name",
}

export function CsvRosterUpload() {
  const [status, setStatus] = useState<Status>({ type: "idle" })
  const inputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus({ type: "error", message: "Выберите файл в формате .csv" })
      return
    }
    setStatus({ type: "loading" })

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rawHeaders = result.meta.fields ?? []
        const headerToField = new Map<string, keyof RosterItem>()
        for (const h of rawHeaders) {
          const field = COL_MAP[normalizeHeader(h)]
          if (field) headerToField.set(h, field)
        }

        const vals = [...headerToField.values()]
        if (!vals.includes("full_name") || !vals.includes("identifier")) {
          setStatus({
            type: "error",
            message: `Обязательные колонки не найдены. Нужны "ФИО" и "ИИН". Найдены: ${rawHeaders.join(", ")}`,
          })
          return
        }

        const items: RosterItem[] = result.data
          .map((row) => {
            const item: Partial<Record<keyof RosterItem, string>> = {}
            for (const [col, field] of headerToField.entries()) {
              const val = row[col]?.trim()
              if (val) item[field] = val
            }
            return item as RosterItem
          })
          .filter((item) => item.full_name && item.identifier)

        if (items.length === 0) {
          setStatus({ type: "error", message: "CSV не содержит записей с ФИО и ИИН" })
          return
        }

        const res = await uploadCollegeRoster(items)
        if (res.error) {
          setStatus({ type: "error", message: res.error })
        } else {
          setStatus({ type: "success", count: res.count ?? items.length })
        }
      },
      error: (err) => {
        setStatus({ type: "error", message: "Ошибка чтения файла: " + err.message })
      },
    })
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="relative pl-4 mb-4">
        <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-blue-400 rounded-full" />
        <p className="text-[11px] font-heading font-bold text-neutral-500 tracking-[0.2em] uppercase">
          Реестр студентов
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">
          Загрузите CSV для верификации зарегистрированных студентов
        </p>
      </div>

      <label
        htmlFor="csv-upload"
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
      >
        {status.type === "loading" && <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />}
        {status.type === "success" && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
        {status.type === "error"   && <AlertCircle  className="w-6 h-6 text-red-400" />}
        {status.type === "idle"    && <Upload className="w-6 h-6 text-neutral-300 group-hover:text-blue-400 transition-colors" />}

        <div className="text-center">
          {status.type === "loading" && (
            <p className="text-xs text-neutral-500 font-heading font-bold">Обработка...</p>
          )}
          {status.type === "success" && (
            <p className="text-xs text-emerald-600 font-heading font-bold">
              Загружено {status.count} записей — страница обновлена
            </p>
          )}
          {status.type === "error" && (
            <p className="text-xs text-red-500 font-heading font-bold leading-snug max-w-sm text-center">
              {status.message}
            </p>
          )}
          {status.type === "idle" && (
            <>
              <p className="text-xs text-neutral-500 font-heading font-bold">
                Перетащите .csv или{" "}
                <span className="text-blue-600">нажмите для выбора</span>
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Колонки: ФИО, ИИН — обязательные · Специальность, Группа — опционально
              </p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          id="csv-upload"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) processFile(f)
            e.target.value = ""
          }}
        />
      </label>

      {(status.type === "success" || status.type === "error") && (
        <button
          onClick={() => setStatus({ type: "idle" })}
          className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-600 font-heading font-bold tracking-widest uppercase transition-colors"
        >
          Загрузить другой файл
        </button>
      )}
    </div>
  )
}
