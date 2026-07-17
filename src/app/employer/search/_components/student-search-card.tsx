"use client"

import { useState } from "react"
import { Bookmark, BookmarkCheck, GraduationCap, Star, BadgeCheck } from "lucide-react"
import { saveStudent, unsaveStudent } from "@/app/employer/_actions"
import { DirectChatDialog } from "@/components/direct-chat-dialog"
import type { ProfileReadiness } from "@/lib/profile-readiness"

type Props = {
  studentId: string
  employerId: string
  currentUserId: string
  currentUserName: string
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  collegeNome: string | null
  specialty: string | null
  courseYear: number | null
  gpa: number | null
  gpaVerified: boolean
  skills: string[] | null
  readiness: ProfileReadiness
  initialSaved: boolean
}

const LEVEL_BAR: Record<string, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-400",
  low: "bg-neutral-300",
}

export function StudentSearchCard({
  studentId,
  employerId,
  currentUserId,
  currentUserName,
  firstName,
  lastName,
  photoUrl,
  collegeNome,
  specialty,
  courseYear,
  gpa,
  gpaVerified,
  skills,
  readiness,
  initialSaved,
}: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)

  const name = [firstName, lastName].filter(Boolean).join(" ") || "Студент"
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "СТ"

  async function toggleSave() {
    setSaving(true)
    if (saved) {
      await unsaveStudent(employerId, studentId)
      setSaved(false)
    } else {
      await saveStudent(employerId, studentId)
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-blue-200 hover:shadow-md hover:shadow-blue-600/5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-11 h-11 rounded-full object-cover border border-neutral-200 shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-heading font-bold text-blue-600">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-[15px] text-neutral-900 truncate">{name}</p>
          {specialty && (
            <p className="text-xs text-neutral-500 truncate mt-0.5">{specialty}</p>
          )}
          {collegeNome && (
            <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
              <GraduationCap className="w-3 h-3 shrink-0" />
              {collegeNome}{courseYear ? `, ${courseYear} курс` : ""}
            </p>
          )}
        </div>
        <button
          onClick={toggleSave}
          disabled={saving}
          className="shrink-0 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
          title={saved ? "Убрать из сохранённых" : "Сохранить студента"}
        >
          {saved
            ? <BookmarkCheck className="w-4 h-4 text-blue-600" />
            : <Bookmark className="w-4 h-4 text-neutral-400" />
          }
        </button>
      </div>

      {/* Readiness */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-1.5 rounded-full ${i < readiness.score ? LEVEL_BAR[readiness.level] : "bg-neutral-100"}`}
            />
          ))}
        </div>
        <span className={`text-[10px] font-heading font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${readiness.labelCls}`}>
          {readiness.label}
        </span>
        {gpa !== null && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-neutral-600 font-heading font-bold">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {gpa.toFixed(1)}
            {gpaVerified && <BadgeCheck className="w-3 h-3 text-emerald-500" />}
          </span>
        )}
      </div>

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((s) => (
            <span key={s} className="text-[10px] font-heading font-bold tracking-wide px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
              {s}
            </span>
          ))}
          {skills.length > 5 && (
            <span className="text-[10px] text-neutral-400 px-2 py-0.5">+{skills.length - 5}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
        <DirectChatDialog
          employerId={employerId}
          studentId={studentId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          studentName={name}
        />
      </div>
    </div>
  )
}
