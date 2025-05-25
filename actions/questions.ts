"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getQuestions() {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get questions
  const { data, error } = await supabase
    .from("qualification_questions")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { questions: data }
}

export async function updateQuestion(id: string, questionText: string) {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Update question
  const { error } = await supabase
    .from("qualification_questions")
    .update({
      question_text: questionText,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function addQuestion(questionText: string) {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get current max position
  const { data: questions, error: positionError } = await supabase
    .from("qualification_questions")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)

  if (positionError) {
    return { error: positionError.message }
  }

  const nextPosition = questions.length > 0 ? questions[0].position + 1 : 1

  // Add question
  const { error } = await supabase.from("qualification_questions").insert({
    user_id: user.id,
    question_text: questionText,
    position: nextPosition,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteQuestion(id: string) {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Delete question
  const { error } = await supabase.from("qualification_questions").delete().eq("id", id).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}
