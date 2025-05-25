"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateAISettings(formData: FormData) {
  const aiName = formData.get("ai-name") as string
  const greetingScript = formData.get("greeting") as string
  const summaryEmail = formData.get("summary-email") as string

  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Update AI settings
  const { error } = await supabase
    .from("ai_settings")
    .update({
      ai_name: aiName,
      greeting_script: greetingScript,
      summary_email: summaryEmail,
    })
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function getAISettings() {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get AI settings
  const { data, error } = await supabase.from("ai_settings").select("*").eq("user_id", user.id).single()

  if (error) {
    return { error: error.message }
  }

  return { settings: data }
}
