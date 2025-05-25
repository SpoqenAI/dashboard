"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const fullName = formData.get("name") as string
  const businessName = formData.get("business-name") as string
  const phoneNumber = formData.get("phone") as string
  const email = formData.get("email") as string

  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      business_name: businessName || null,
      phone_number: phoneNumber,
    })
    .eq("id", user.id)

  if (profileError) {
    return { error: profileError.message }
  }

  // Update email if changed
  if (email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({
      email,
    })

    if (emailError) {
      return { error: emailError.message }
    }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function getProfile() {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get profile
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) {
    return { error: error.message }
  }

  return { profile: data }
}
