"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()
  if (profile?.role !== "college_admin") throw new Error("Unauthorized")
}

export async function approveUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from("profiles").update({ approval_status: "approved" }).eq("user_id", userId)
  revalidatePath("/admin")
}

export async function rejectUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from("profiles").update({ approval_status: "rejected" }).eq("user_id", userId)
  revalidatePath("/admin")
}
