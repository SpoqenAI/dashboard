// Minimal generated Supabase types used by Edge Functions
// This is a focused subset containing only the tables/columns we access
// so TypeScript can type queries precisely without unsafe casts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string;
          email_notifications: boolean | null;
          vapi_assistant_id: string | null;
        };
        Insert: {
          id?: string;
          email_notifications?: boolean | null;
          vapi_assistant_id?: string | null;
        };
        Update: {
          id?: string;
          email_notifications?: boolean | null;
          vapi_assistant_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
