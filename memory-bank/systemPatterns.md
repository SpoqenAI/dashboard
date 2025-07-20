# System Patterns

This document outlines the system architecture, key technical decisions, design patterns, and component relationships.

## Architecture Overview

The project follows a Next.js App Router architecture, organizing code into `app/` for pages and API routes, `components/` for reusable UI, `lib/` for utilities, and `hooks/` for custom React hooks. It leverages React Server Components (RSC) to minimize client-side JavaScript. Security headers are configured to enhance protection against common web vulnerabilities, with specific CORS settings for development environments to support tools like ngrok.

## Key Technical Decisions

- **Frontend:** Next.js App Router for routing and rendering, aiming for server-side rendering (SSR).
- **UI:** Shadcn UI and Radix UI for robust and accessible components, styled with Tailwind CSS.
- **Data Layer:** Supabase SDK for all data fetching and querying operations, including server-side rendering with `@supabase/ssr`. The database schema includes a `public.profiles` table (storing user profile information like email, name, business, etc.), a `public.user_settings` table (for AI and user preferences, now including `vapi_assistant_id` to link users to their specific AI assistants), a `public.user_subscriptions` table (for legacy Stripe-based subscriptions), and a `public.subscriptions` table (for Paddle-based subscriptions). A new `public.call_analysis` table has been added to cache AI-generated insights (sentiment, lead quality, action points) from VAPI calls, significantly improving dashboard analytics performance and reducing redundant VAPI API calls. Row Level Security (RLS) is enabled for these tables, with policies ensuring users can only view/update their own data. Indexes are created for performance. Database functions like `handle_updated_at()` automatically update `updated_at` timestamps, `handle_new_user()` (optional trigger) automatically creates profile, settings, and subscription entries on new user sign-up with validations, and `get_user_data()` and `user_profile_exists()` provide secure data retrieval. Grants are set for `anon` and `authenticated` roles. The dashboard no longer contains a "Coming Soon" section as previously thought.
- **AI Features:** Vercel AI SDK for building AI-powered functionalities, including AI SDK Core for LLM interactions and AI SDK UI hooks for chat interfaces. New API routes (`/api/vapi/action-points` and `/api/vapi/bulk-analyze`) interact with VAPI to fetch call transcripts and summaries, perform AI analysis (e.g., sentiment, key points), and store these results in the `call_analysis` table. **The `/api/vapi/bulk-analyze` endpoint has been refined to intelligently identify and process only those calls that do not yet have an existing analysis in the `call_analysis` table, ensuring efficient and targeted data population.** The `/api/vapi/analytics` route now aggregates data from `call_analysis` to power the dashboard metrics.
- **State Management:** `nuqs` for URL search parameter state management.
- **Deployment:** Automated continuous deployment to Vercel via GitHub Actions. This includes production deployments on `main` branch pushes/releases and preview deployments for all pull requests to `main`. The current strategy favors Vercel-handled builds over GitHub Actions builds for optimization and cost-effectiveness.
- **Error Tracking:** Sentry integration with `@sentry/nextjs` for comprehensive error monitoring, including automatic Vercel Cron Monitors.
- **Security Headers:** Implemented `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **CORS:** Flexible CORS policy (`Access-Control-Allow-Origin: *`) for `/api/(.*)` routes in development to facilitate local testing with tools like ngrok.
- **Billing Integration:** Paddle for subscription management, now following Next.js Paddle starter kit best practices with structured utilities under `utils/paddle/`. The new architecture includes:
  - **Centralized SDK Management**: `utils/paddle/get-paddle-instance.ts` for consistent Paddle initialization
  - **Data Helpers**: `utils/paddle/data-helpers.ts` for parsing, error handling, and response formatting
  - **Money Parsing**: `utils/paddle/parse-money.ts` for consistent currency formatting and amount conversion
  - **Subscription Management**: `utils/paddle/get-subscriptions.ts` and `utils/paddle/get-subscription.ts` for server-side data fetching
  - **Transaction History**: `utils/paddle/get-transactions.ts` for payment history with pagination
  - **Webhook Processing**: `utils/paddle/process-webhook.ts` with ProcessWebhook class for structured event handling
  - **Enhanced Checkout**: Modern inline checkout using `initializePaddle` with real-time data updates and proper event handling
  - The database schema supports Paddle billing with `paddle_customer_id` in `profiles` and a dedicated `subscriptions` table with atomic upsert functions for webhook processing.

## Security Architecture

### Comprehensive User-Scoped Security Model

The project follows a **comprehensive layered security model** with runtime safeguards and user-scoped utilities, implemented across multiple domains:

**Layer 1: API Routes (Authentication & Authorization)**

- Use `createClient()` for user-scoped operations
- Handle user authentication and session validation
- Perform authorization checks (e.g., validate customer ownership, assistant ownership)
- Extract and validate user-specific identifiers (customer IDs, subscription IDs, assistant IDs)

**Layer 2: User-Scoped Utility Functions (Recommended)**

- Primary interface for data access with built-in authentication
- Handle user authentication and authorization internally
- Provide clean, safe APIs that eliminate security mistakes
- Available for: Paddle transactions, user settings, VAPI assistants

**Layer 3: Admin Functions with Runtime Safeguards (Restricted)**

- Use `createSupabaseAdmin()` for direct database access
- Protected by `validateServerContext()` runtime checks
- Assume pre-validated, trusted parameters from authenticated callers
- Include comprehensive audit logging

**Security Implementation Domains:**

#### Paddle Transactions Security

```typescript
// RECOMMENDED: User-scoped function
const result = await getUserTransactions(supabase, options);

// ADMIN (with safeguards): Admin function
const transactions = await getTransactionsByCustomerId(customerId, options); // Throws if misused
```

#### User Settings Security

```typescript
// RECOMMENDED: User-scoped function
const result = await getUserSettings(supabase, { select: 'vapi_assistant_id' });

// ADMIN (with safeguards): Admin function
const settings = await getUserSettingsByUserId(userId, options); // Throws if misused
```

#### VAPI Assistant Security

```typescript
// RECOMMENDED: User-scoped function
const result = await getUserAssistantInfo(supabase);

// ADMIN (with safeguards): Admin function
const ownerId = await getAssistantOwnerUserId(assistantId); // Throws if misused
```

**Runtime Security Safeguards:**

- **Browser Detection**: Prevents client-side execution of admin functions
- **Environment Validation**: Requires `SUPABASE_SERVICE_ROLE_KEY` in server context
- **Audit Logging**: Comprehensive logging of all admin function usage
- **Error Guidance**: Clear error messages directing to safer alternatives

**Security Benefits:**

- **Zero Client-Side Risk**: Runtime safeguards prevent browser execution
- **Simplified Authentication**: User-scoped functions handle auth internally
- **Reduced Attack Surface**: Fewer places where admin privileges are used
- **Clear Developer Guidance**: Impossible to miss the recommended approach
- **Comprehensive Protection**: All user-facing APIs follow consistent security patterns

**API Route Migration Pattern:**

```typescript
// BEFORE: Manual auth + admin client usage
const {
  data: { user },
} = await supabase.auth.getUser();
const admin = createSupabaseAdmin();
const { data } = await admin
  .from('user_settings')
  .select('*')
  .eq('id', user.id);

// AFTER: User-scoped function
const result = await getUserSettings(supabase);
```

**Security Requirements for Admin Function Callers:**

- Must authenticate users before calling admin utility functions
- Must validate user authorization for requested data
- Must pass only user-owned identifiers to utility functions
- Must handle customer/assistant ID mapping and validation

**User-Scoped Function Benefits:**

- Authentication and authorization handled internally
- Consistent error handling and logging
- Clear success/error response patterns
- Eliminates common security mistakes
- Preferred approach for all new development

## Design Patterns

- **Functional and Declarative Programming:** Emphasis on functional components and declarative JSX.
- **Modularization:** Code is organized into reusable components and utility functions.
- **Structured Utility Organization:** Following Next.js Paddle starter kit patterns with specialized utility directories (`utils/paddle/`) containing focused helper functions for specific domains.
- **Mobile-First Responsive Design:** Implemented using Tailwind CSS.
- **Component Structure:** Exported components, subcomponents, helpers, static content, and types within files.
- **Class-Based Processing:** Structured event processing using classes (e.g., ProcessWebhook) for better organization and maintainability.

## Component Relationships

- `app/`: Contains top-level pages and route handlers, often composed of components from `components/`.
- `components/`: Houses UI building blocks used across different pages.
- `lib/`: Provides shared utility functions and configurations that components and pages can import.
- `utils/`: Contains specialized utility directories organized by domain (e.g., `utils/paddle/` for payment-related utilities).
- `hooks/`: Contains custom React hooks to encapsulate reusable logic for components.
- `api/webhooks/paddle`: Handles incoming Paddle webhook events using the ProcessWebhook class to update the Supabase database.
- `utils/paddle/`: Centralized Paddle utilities including:
  - `get-paddle-instance.ts`: SDK initialization and configuration
  - `data-helpers.ts`: Data parsing, error handling, and formatting
  - `parse-money.ts`: Currency formatting and amount conversion
  - `get-subscriptions.ts`, `get-subscription.ts`: Server-side subscription data management
  - `get-transactions.ts`: Transaction history with pagination support
  - `process-webhook.ts`: Structured webhook event processing
- `api/vapi/action-points`: Processes VAPI call data and stores AI-generated insights (sentiment, lead quality, etc.) into the `call_analysis` table.
- `api/vapi/analytics`: Aggregates and serves analytics data from VAPI calls and the `call_analysis` table to the dashboard, ensuring data is filtered by the user's specific assistant.
- `api/vapi/bulk-analyze`: Provides an endpoint for triggering batch processing of historical VAPI calls to populate the `call_analysis` table.
- `.github/workflows/`: Contains GitHub Actions workflows for automated testing, building, and deployment to Vercel.
- `supabase/migrations/`: Contains database migration scripts for schema changes.
