# Progress

This document tracks what works, what's left to build, current status, and known issues.

## What Works

-   Basic project setup and dependency management with pnpm.
-   Development server can be run (`pnpm dev`).
-   Production build can be created (`pnpm build`).
-   Automated testing setup is in place (`pnpm test`).
-   Continuous deployment to Vercel via GitHub Actions is configured.
-   Core project structure (App Router, components, lib, hooks) is established.
-   Paddle checkout process is functional.
-   Database schema for `profiles` (with `paddle_customer_id`) and `subscriptions` tables is in place.
-   Paddle webhooks (`subscription.created`, `updated`, `canceled`) are configured to be received and processed by the application.
-   Enhanced debugging tools for subscriptions are available (console logging, debug scripts, webhook verification).

## What's Left to Build

-   Specific AI receptionist features and integrations with Vapi.
-   Full implementation of Paddle billing system (e.g., upgrade/downgrade, usage-based billing, email notifications).
-   Detailed user profile and onboarding flows beyond initial setup.
-   Comprehensive error handling and logging (though some debugging enhancements are in place).
-   Complete Supabase schema and data models, beyond initial migrations.
-   Customization of billing UI.

## Current Status

-   The project has a solid foundation for Next.js, Supabase, and Paddle billing integration.
-   Subscription management via Paddle webhooks and database synchronization is implemented.
-   Tools and guides are available for debugging subscription-related issues.

## Known Issues

-   No specific known issues are detailed in the `README.md` at this stage, but the `SUBSCRIPTION_DEBUG_GUIDE.md` addresses common subscription-related problems.
-   The `README.md` indicates a TODO for replacing `YOUR_USERNAME/YOUR_REPOSITORY` in the cloning instructions.
-   `--passWithNoTests` flag is used in CI, suggesting tests might not be comprehensive yet.
-   Common Paddle subscription issues include:
    -   Database Schema Mismatch (resolved by applied fixes).
    -   Webhook Not Configured or Processing Error.
    -   Frontend Data Fetching Issue for subscription status.
    -   Webhook signature verification failures.
    -   Missing user ID in webhook custom data.

## Evolution of Decisions

-   The choice of Next.js App Router and React Server Components reflects a modern approach to web development, prioritizing performance and server-side rendering.
-   Supabase was chosen for its integrated database, authentication, and real-time capabilities.
-   GitHub Actions and Vercel were selected for streamlined CI/CD.
-   Explicit documentation and debugging guides (like `SUBSCRIPTION_DEBUG_GUIDE.md`) highlight a commitment to maintainability and ease of troubleshooting for critical features like billing. 