# System Patterns

This section outlines the anticipated system architecture and key design patterns employed in the dashboard application. The architecture is designed for scalability, maintainability, and clear separation of concerns.

**System Architecture:**

- **Client-Side (Frontend):** Built with Next.js and React, leveraging server-side rendering (SSR) or static site generation (SSG) where appropriate for performance and SEO. The `app/` directory structure suggests a page-based routing system with components (`components/`) and hooks (`hooks/`).
- **Server-Side (Backend/API):** Utilizes Next.js API routes (`app/api/`) for handling server-side logic, data fetching, and external service integrations. This includes endpoints for geocoding, Sentry examples, site URL updates, and webhooks (e.g., Paddle).
- **Database:** Supabase is the primary backend-as-a-service (BaaS), providing PostgreSQL database, authentication, and storage capabilities. Database interactions are likely handled through `lib/supabase/`.
- **Authentication:** Supabase Auth is integrated for user authentication flows (sign-up, login, password reset), as indicated by `app/auth/`, `app/login/`, `app/signup/`.
- **Storage:** Supabase Storage for file storage, if required.
- **Edge Functions:** Potential use of Supabase Edge Functions for serverless logic, as suggested by general Supabase capabilities.

**Key Technical Decisions:**

- **Full-stack JavaScript/TypeScript:** Consistency across frontend and backend using TypeScript for improved code quality and maintainability.
- **Convention over Configuration:** Adhering to Next.js and Supabase conventions for faster development.
- **Modularity:** Breaking down the application into smaller, reusable components and services.
- **API-First Approach:** Designing clear API contracts between frontend and backend.
- **Observability:** Integration of Sentry for error tracking and performance monitoring (`sentry.server.config.ts`, `sentry.edge.config.ts`).

**Design Patterns in Use (Anticipated):**

- **Component-Based Architecture:** For the React frontend, promoting reusability and isolated development of UI elements.
- **Service Layer/Module Pattern:** Encapsulating specific business logic or external API interactions within dedicated modules (e.g., `lib/supabase/`).
- **Authentication Flow Pattern:** Standard patterns for user registration, login, and session management.
- **Webhook Handling:** Implementation of robust webhook processing for external services like Paddle.
- **Database Migrations:** Using Supabase Migrations (`supabase/migrations/`) for schema management.

**env vars** this is our .env file config with the actuall key values for security.
NEXT_PUBLIC_SUPABASE_URL
VAPI_PRIVATE_KEY
VAPI_PUBLIC_KEY
VAPI_ASSISTANT_ID
VAPI_PHONE_NUMBER_ID
NEXT_PUBLIC_SUPABASE_ANON_KEY