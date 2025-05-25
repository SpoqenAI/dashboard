"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function getCalls() {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get calls
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("user_id", user.id)
    .order("call_date", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { calls: data }
}

export async function getCallDetails(callId: string) {
  const supabase = createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get call
  const { data: call, error: callError } = await supabase
    .from("calls")
    .select("*")
    .eq("id", callId)
    .eq("user_id", user.id)
    .single()

  if (callError) {
    return { error: callError.message }
  }

  // Get call responses
  const { data: responses, error: responsesError } = await supabase
    .from("call_responses")
    .select("*")
    .eq("call_id", callId)
    .order("created_at", { ascending: true })

  if (responsesError) {
    return { error: responsesError.message }
  }

  return { call, responses }
}
