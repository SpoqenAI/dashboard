"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("name") as string
  const phoneNumber = formData.get("phone") as string
  const businessName = formData.get("business-name") as string

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create profile
  if (data?.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      business_name: businessName || null,
    })

    if (profileError) {
      return { error: profileError.message }
    }

    // Create default AI settings
    const { error: settingsError } = await supabase.from("ai_settings").insert({
      user_id: data.user.id,
      ai_name: "Ava",
      greeting_script: `Hi, thanks for calling ${fullName}'s office! I'm Ava, the assistant. How can I help you today?`,
      summary_email: email,
    })

    if (settingsError) {
      return { error: settingsError.message }
    }

    // Create default qualification questions
    const defaultQuestions = [
      { question_text: "Are you looking to buy, sell, or ask about a property?", position: 1 },
      { question_text: "What's your name and the best number to reach you?", position: 2 },
      { question_text: `When would be the best time for ${fullName} to call you back?`, position: 3 },
    ]

    for (const question of defaultQuestions) {
      const { error: questionError } = await supabase.from("qualification_questions").insert({
        user_id: data.user.id,
        question_text: question.question_text,
        position: question.position,
      })

      if (questionError) {
        return { error: questionError.message }
      }
    }
  }

  return { success: true }
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = createServerSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/")
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  revalidatePath("/")
  redirect("/")
}

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string

  const supabase = createServerSupabaseClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string

  const supabase = createServerSupabaseClient()

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
