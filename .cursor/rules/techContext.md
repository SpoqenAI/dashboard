# Tech Context

This document details the technologies used, development setup, technical constraints, and dependencies.

## Technologies Used

-   **Frontend Framework:** Next.js (App Router)
-   **UI Library:** Shadcn UI, Radix UI
-   **Styling:** Tailwind CSS
-   **Backend/Database:** Supabase
-   **Deployment:** Vercel (via GitHub Actions)
-   **AI Integration:** Vercel AI SDK
-   **Package Manager:** pnpm
-   **Language:** TypeScript
-   **Other APIs:** Geoapify (for address autocomplete), Paddle (for billing)
-   **Error Tracking:** Sentry
-   **Email:** SendGrid
-   **Telephony/SMS:** Twilio

## Development Setup

-   **Prerequisites:** Node.js (v20+), pnpm (v8+), Paddle Sandbox Account, Supabase Project with Auth.
-   **Installation:** `pnpm install --no-frozen-lockfile`
-   **Environment Variables:** Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GEOAPIFY_API_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_ID`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`.
-   **Running Dev Server:** `pnpm dev`
-   **Testing:** `pnpm test` (configured to pass even if no tests found)
-   **Building:** `pnpm build`
-   **Linting:** `pnpm lint`, `pnpm lint:fix`
-   **Type Checking:** `pnpm type-check`
-   **Formatting:** `pnpm format`, `pnpm format:check`
-   **Bundle Analysis:** `pnpm analyze`
-   **Cleaning:** `pnpm clean`
-   **Local Webhook Testing:** Uses `ngrok` for exposing local `api/webhooks/paddle` endpoint to Paddle for testing `subscription.created`, `subscription.updated`, `subscription.canceled` events.
-   **Paddle Product Catalog Setup:** Requires creating products and prices in Paddle Dashboard.
-   **Paddle Webhook Configuration:** Setting up webhook destination in Paddle to `/api/webhooks/paddle` for subscription events.

## Technical Constraints

-   Node.js v20 or higher.
-   pnpm v8 or higher.
-   Environment variables must be correctly configured for local development and deployment, including specific Paddle credentials and Vercel deployment secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
-   Strict linting and formatting rules enforced by ESLint and Prettier.
-   TypeScript compilation configured with `strict: true`, `noEmit: true`, `isolatedModules: true`.
-   Ngrok URLs are dynamic and need to be updated in Paddle dashboard upon restart for webhook testing.
-   Paddle environment needs to be switched from `sandbox` to `production` and corresponding environment variables updated for production deployment.
-   Deployment requires specific GitHub Actions permissions (`contents: read`, `pull-requests: write`, `deployments: write`).

## Dependencies

Managed via `pnpm` and listed in `package.json`.

**Key Dependencies:**
-   `@geoapify/geocoder-autocomplete`, `@geoapify/react-geocoder-autocomplete`: Address autocomplete.
-   `@hookform/resolvers`, `react-hook-form`, `zod`: Form management and validation.
-   `@paddle/paddle-js`, `@paddle/paddle-node-sdk`: Paddle billing integration.
-   `@radix-ui/*`: Core UI components (used by Shadcn UI).
-   `@sentry/nextjs`: Sentry error tracking.
-   `@sendgrid/mail`: Email sending.
-   `@supabase/auth-helpers-nextjs`, `@supabase/ssr`, `@supabase/supabase-js`: Supabase integration (auth, SSR, client).
-   `autoprefixer`, `tailwindcss-animate`, `tailwind-merge`: Tailwind CSS utilities.
-   `bad-words`: Content filtering.
-   `class-variance-authority`, `clsx`: Utility for conditional classes.
-   `cmdk`: Command palette.
-   `date-fns`, `react-day-picker`: Date handling and picker.
-   `embla-carousel-react`: Carousel component.
-   `input-otp`: OTP input.
-   `libphonenumber-js`: Phone number parsing.
-   `lodash-es`: Utility functions.
-   `lucide-react`: Icon library.
-   `next`, `react`, `react-dom`, `next-themes`: Core Next.js and React.
-   `react-password-strength-bar`, `zxcvbn`: Password strength.
-   `react-resizable-panels`: Resizable panels.
-   `recharts`: Charting library.
-   `sonner`: Toast notifications.
-   `twilio`: Twilio API for calls/SMS.
-   `vaul`: Drawer component.

**Development Dependencies:**
-   `@types/*`: TypeScript type definitions.
-   `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`, `eslint-config-next`: ESLint configuration.
-   `cross-env`: Environment variables for scripts.
-   `dotenv`: Loading environment variables.
-   `postcss`, `prettier`, `prettier-plugin-tailwindcss`: Styling and formatting tools.
-   `supabase`: Supabase CLI.
-   `typescript`: TypeScript compiler. 