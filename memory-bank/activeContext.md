# Active Context

This document tracks the current work focus, recent changes, next steps, and important decisions.

## Current Focus

**✅ COMPLETED: VAPI Assistant Provisioning via Supabase Edge Function (July 2025)**

**Root Issue**: The system needed to provision a VAPI assistant for a user only after their email was verified, requiring an external API call and robust, idempotent backend logic.

**🚀 FEATURE IMPLEMENTED: Automated VAPI Assistant Provisioning**

- **Database Layer:**
  - Added `pending_vapi_provision` table to queue users whose email has just been verified.
  - Added a Postgres trigger/function on `auth.users` that inserts into this table when `email_confirmed_at` transitions from NULL to a timestamp.
- **Supabase Edge Function Layer:**
  - Implemented `vapi-assistant-provision` Edge Function (Deno/TypeScript) that polls the queue, provisions a VAPI assistant via the VAPI API, updates `user_settings.vapi_assistant_id`, and marks the row as processed or errored.
  - Ensured idempotency: checks if a user already has a VAPI assistant before provisioning.
  - Handles errors robustly and logs failures to the queue table.
- **Integration & Testing:**
  - Deployed the Edge Function to Supabase.
  - Simulated email verification by inserting into `pending_vapi_provision`.
  - Confirmed that a VAPI assistant is created and its ID is stored in `user_settings` for the user, with no duplicates.
  - All test users with verified emails were processed as expected.

**Next Steps:**

- Monitor logs and error fields in `pending_vapi_provision` for any failures.
- Consider scheduling the Edge Function or triggering it via webhook for real-time processing.
- Add alerting/monitoring for failed provisions if needed.

## Technical Notes

- The Edge Function uses the Supabase service role key and VAPI API key from environment variables.
- Logic for VAPI API calls and user_settings update is reused from the existing API route.
- The function is idempotent and safe to run repeatedly.
- All changes are documented in the memory bank and tracked in TODOs.

---
