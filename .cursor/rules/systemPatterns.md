# System Patterns

This document outlines the system architecture, key technical decisions, design patterns, and component relationships.

## Architecture Overview

The project follows a Next.js App Router architecture, organizing code into `app/` for pages and API routes, `components/` for reusable UI, `lib/` for utilities, and `hooks/` for custom React hooks. It leverages React Server Components (RSC) to minimize client-side JavaScript. Security headers are configured to enhance protection against common web vulnerabilities, with specific CORS settings for development environments to support tools like ngrok.

## Key Technical Decisions

- **Frontend:** Next.js App Router for routing and rendering, aiming for server-side rendering (SSR).
- **UI:** Shadcn UI and Radix UI for robust and accessible components, styled with Tailwind CSS.
- **Data Layer:** Supabase SDK for all data fetching and querying operations, including server-side rendering with `@supabase/ssr`. The database schema includes a `public.profiles` table (storing user profile information like email, name, business, etc.), a `public.user_settings` table (for AI and user preferences), and a `public.user_subscriptions` table (for legacy Stripe-based subscriptions), and a `public.subscriptions` table (for Paddle-based subscriptions). Row Level Security (RLS) is enabled for these tables, with policies ensuring users can only view/update their own data. Indexes are created for performance. Database functions like `handle_updated_at()` automatically update `updated_at` timestamps, `handle_new_user()` (optional trigger) automatically creates profile, settings, and subscription entries on new user sign-up with validations, and `get_user_data()` and `user_profile_exists()` provide secure data retrieval. Grants are set for `anon` and `authenticated` roles.
- **AI Features:** Vercel AI SDK for building AI-powered functionalities, including AI SDK Core for LLM interactions and AI SDK UI hooks for chat interfaces.
- **State Management:** `nuqs` for URL search parameter state management.
- **Deployment:** Automated continuous deployment to Vercel via GitHub Actions. This includes production deployments on `main` branch pushes/releases and preview deployments for all pull requests to `main`. The current strategy favors Vercel-handled builds over GitHub Actions builds for optimization and cost-effectiveness.
- **Error Tracking:** Sentry integration with `@sentry/nextjs` for comprehensive error monitoring, including automatic Vercel Cron Monitors.
- **Security Headers:** Implemented `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **CORS:** Flexible CORS policy (`Access-Control-Allow-Origin: *`) for `/api/(.*)` routes in development to facilitate local testing with tools like ngrok.
- **Billing Integration:** Paddle for subscription management, relying on client-side and server-side Paddle SDKs, and webhook processing for `subscription.created`, `updated`, and `canceled` events. The database schema has been updated to support Paddle billing with a `paddle_customer_id` in `profiles` and a dedicated `subscriptions` table.

## Design Patterns

- **Functional and Declarative Programming:** Emphasis on functional components and declarative JSX.
- **Modularization:** Code is organized into reusable components and utility functions.
- **Mobile-First Responsive Design:** Implemented using Tailwind CSS.
- **Component Structure:** Exported components, subcomponents, helpers, static content, and types within files.

## Component Relationships

- `app/`: Contains top-level pages and route handlers, often composed of components from `components/`.
- `components/`: Houses UI building blocks used across different pages.
- `lib/`: Provides shared utility functions and configurations that components and pages can import.
- `hooks/`: Contains custom React hooks to encapsulate reusable logic for components.
- `api/webhooks/paddle`: Handles incoming Paddle webhook events to update the Supabase database.
- `.github/workflows/`: Contains GitHub Actions workflows for automated testing, building, and deployment to Vercel.
- `supabase/migrations/`: Contains database migration scripts for schema changes.
