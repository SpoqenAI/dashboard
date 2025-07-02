# Active Context

This document tracks the current work focus, recent changes, next steps, and important decisions.

## Current Focus

The current focus is on understanding the existing codebase, its architecture, and development practices to establish a comprehensive knowledge base within the memory bank.

## Recent Changes

- Initial setup of core memory bank files (`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`).
- Populated initial content for `projectbrief.md`, `productContext.md`, `techContext.md`, and `systemPatterns.md` based on `README.md`.
- Updated `techContext.md` with detailed dependencies, scripts, and TypeScript configuration from `package.json` and `tsconfig.json`.
- Updated `systemPatterns.md` with details on security headers, CORS, and Sentry integration from `next.config.mjs`.
- Added information about `ngrok` setup for local Paddle webhook testing to `techContext.md`.
- Updated `techContext.md` and `systemPatterns.md` with comprehensive Paddle billing setup, including environment variables, product catalog, webhooks, and database schema (`profiles` and `subscriptions` tables).
- Updated `progress.md` with current status, what works, what's left, and known issues related to Paddle billing and subscription debugging.
- Updated `techContext.md` and `systemPatterns.md` with Vercel deployment specifics, including required GitHub secrets, permissions, and deployment strategies (production via main/releases, preview via PRs).
- Updated `systemPatterns.md` with detailed Supabase database schema information, including `profiles`, `user_settings`, `user_subscriptions` (legacy Stripe), and `subscriptions` (Paddle) tables, RLS policies, indexes, and SQL functions (`handle_updated_at`, `handle_new_user`, `get_user_data`, `user_profile_exists`), and grants.

## Next Steps

- No immediate next steps identified for filling the memory bank. The memory bank is now comprehensively updated based on the current codebase examination.
- Ready to proceed with specific development tasks based on this understanding.

## Decisions and Considerations

- Prioritizing foundational understanding before proposing any code changes.
- Ensuring the memory bank accurately reflects the current state and known practices.
- Documenting development-specific tools and setups like `ngrok` for comprehensive context.
- Thoroughly documenting billing integration due to its complexity and criticality.
- Detailed capture of Supabase schema and functions for clear database interaction understanding.

## Learnings and Insights

- The project is a Next.js App Router application with a strong emphasis on Server Components.
- Supabase is used for both database and authentication.
- Deployment is automated via GitHub Actions to Vercel, with distinct workflows for production and preview environments.
- Strong conventions for code style, branching, and commit messages are encouraged.
- Comprehensive environment variable management is in place for both local development and CI/CD.
- Local webhook testing with ngrok is a key development setup for Paddle integration.
- The Paddle billing integration involves specific database schema changes and webhook configurations, with dedicated debugging procedures in place.
- The Supabase database schema includes multiple user-related tables, functions for data management and security, and a dual approach to subscription management (legacy Stripe and current Paddle).
