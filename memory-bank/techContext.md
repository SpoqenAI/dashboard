# Tech Context

This section details the core technologies, development environment setup, and key tools utilized in the dashboard application project. Adhering to these technologies and patterns ensures consistency and maintainability across the codebase.

**Core Technologies:**
-   **Frontend Framework:** Next.js (version inferred from `next.config.mjs` and `app/` directory structure, likely 13+ with App Router).
-   **UI Framework/Library:** React.
-   **Language:** TypeScript (configured via `tsconfig.json`).
-   **Styling:** Tailwind CSS (configured via `tailwind.config.ts` and `postcss.config.mjs`) for utility-first styling.
-   **Backend-as-a-Service (BaaS):** Supabase (indicated by `supabase/`, `lib/supabase/`, and `supabase.sql`) for database (PostgreSQL), authentication, and storage.
-   **Database Migrations:** Supabase Migrations (`supabase/migrations/`).
-   **Error Tracking & Performance Monitoring:** Sentry (configured via `sentry.edge.config.ts`, `sentry.server.config.ts`).

**Development Setup:**
-   **Package Manager:** PNPM (indicated by `pnpm-lock.yaml` and `pnpm-workspace.yaml`).
-   **Environment Variables:** Expected to be managed through `.env` files for local development and platform-specific configurations (e.g., Vercel) for deployment.
-   **Local Development Server:** `next dev` for running the Next.js application.
-   **Database Setup:** Local Supabase setup using the Supabase CLI, or connection to a remote Supabase project.

**Technical Constraints:**
-   **Supabase Ecosystem:** Development is constrained to the capabilities and patterns offered by Supabase for database, auth, and storage.
-   **Next.js Architecture:** Adherence to Next.js's App Router conventions for routing, data fetching, and API routes.
-   **TypeScript Strictness:** Code must conform to TypeScript's type-checking rules, promoting robust and error-free development.

**Dependencies (Key Libraries/Packages):**
-   `react`, `react-dom`
-   `next`
-   `tailwindcss`, `postcss`, `autoprefixer`
-   `@supabase/supabase-js`
-   `@sentry/nextjs`, `@sentry/react`
-   Potentially other UI libraries or utility packages as needed.

**Tool Usage Patterns:**
-   **PNPM:** For installing dependencies and running scripts.
-   **Supabase CLI:** For local database development, migrations, and potentially deploying Edge Functions.
-   **Git:** For version control.
-   **IDE:** Visual Studio Code with relevant extensions for TypeScript, React, Tailwind CSS, etc. 