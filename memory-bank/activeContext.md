# Active Context

This document tracks the current work focus, recent changes, next steps, and important decisions.

## 🚨 CRITICAL SECURITY FIX COMPLETED (July 2025)

**Issue**: A critical security vulnerability was identified where call history data from User A would persist in memory and be displayed to User B after User A logged out and User B logged in on the same device.

**Root Cause**: Multiple data persistence mechanisms were not being cleared on user logout:

1. SWR cache in `useDashboardAnalytics` was not being invalidated when users signed out
2. **localStorage** was storing user-specific analytics events and billing preferences that persisted across sessions

**Enhanced Security Fix Implemented**:

1. **Modified `hooks/use-dashboard-analytics.tsx`**:

   - Added `useAuth` dependency to detect user changes
   - Modified SWR key to be null when no user is present (prevents loading without authentication)
   - Set `keepPreviousData: false` to prevent retaining previous user's data
   - Added `useEffect` to clear cache when user logs out

2. **Enhanced `hooks/use-auth.tsx`**:
   - Added comprehensive `clearAllCaches()` function that clears:
     - All SWR caches using `mutate(() => true, undefined, { revalidate: false })`
     - **localStorage items containing user-specific data**:
       - `'analytics_events'` (containing userId, sessionId, interaction data)
       - `'billingNotificationPreferences'` (user notification settings)
     - Analytics tracking instance via `cleanupAnalytics()`
   - Clear all caches and localStorage on `SIGNED_OUT` event
   - Clear all caches and localStorage on `SIGNED_IN` event (fresh data for new user)
   - Clear all caches and localStorage before signing out to prevent race conditions
   - Added browser environment checks to prevent SSR issues

**Testing Requirements**:

- Test User A login → dashboard access → logout → User B login → verify User B sees only their data
- Verify no data leakage between different user accounts
- Test across different browsers and devices
- **Verify localStorage is cleared**: Check browser dev tools that 'analytics_events' and 'billingNotificationPreferences' are removed on logout

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

## 2025-07-13: Onboarding Replaced by Welcome Screen

- The multi-step onboarding flow has been fully replaced by a single /welcome page.
- /welcome explains free tier features and upgrade path, with 'Skip for now' and 'Subscribe now' buttons.
- Both buttons call a robust server action to set welcome_completed=true in user_settings, then redirect appropriately.
- Middleware enforces that /welcome is only accessible if welcome_completed is false/null, and all protected routes require welcome_completed=true.
- All legacy onboarding pages (/onboarding/profile, /onboarding/assistant, /onboarding/subscribe, /onboarding/processing) have been removed and /onboarding now redirects to /dashboard.
- All logic branches are commented for clarity.
- Next step: Test the new flow for new, returning, and legacy users, including edge cases (missing user_settings, direct navigation, server action errors).

## Technical Notes

- The Edge Function uses the Supabase service role key and VAPI API key from environment variables.
- Logic for VAPI API calls and user_settings update is reused from the existing API route.
- The function is idempotent and safe to run repeatedly.
- All changes are documented in the memory bank and tracked in TODOs.
- **SECURITY**: User data isolation is now properly enforced through cache invalidation on authentication state changes.

---
