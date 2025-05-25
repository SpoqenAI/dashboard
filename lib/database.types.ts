export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          business_name: string | null
          phone_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          business_name?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          business_name?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_settings: {
        Row: {
          id: string
          user_id: string
          ai_name: string
          greeting_script: string
          summary_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_name?: string
          greeting_script?: string
          summary_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_name?: string
          greeting_script?: string
          summary_email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      qualification_questions: {
        Row: {
          id: string
          user_id: string
          question_text: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_text: string
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_text?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          user_id: string
          caller_name: string | null
          caller_phone: string | null
          call_date: string
          duration: number | null
          summary: string | null
          best_callback_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caller_name?: string | null
          caller_phone?: string | null
          call_date?: string
          duration?: number | null
          summary?: string | null
          best_callback_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caller_name?: string | null
          caller_phone?: string | null
          call_date?: string
          duration?: number | null
          summary?: string | null
          best_callback_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      call_responses: {
        Row: {
          id: string
          call_id: string
          question_id: string | null
          question_text: string
          response_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          question_id?: string | null
          question_text: string
          response_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          question_id?: string | null
          question_text?: string
          response_text?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_name: string | null
          plan_price: number | null
          status: string | null
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_name?: string | null
          plan_price?: number | null
          status?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_name?: string | null
          plan_price?: number | null
          status?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
