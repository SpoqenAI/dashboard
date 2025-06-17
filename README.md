# Spoqen Dashboard

_AI Receptionist for Real Estate Agents_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/veskos-projects/spoqen-dashboard)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Cloning the Repository](#cloning-the-repository)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Development Server](#running-the-development-server)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Contributing](#contributing)
  - [Issue Tracking (Linear)](#issue-tracking-linear)
  - [Branching Strategy](#branching-strategy)
  - [Commit Conventions](#commit-conventions)
  - [Pull Requests](#pull-requests)
  - [Coding Standards](#coding-standards)
- [License](#license)

## Overview

Spoqen Dashboard is an AI-powered receptionist system designed specifically for real estate agents. This Next.js application provides intelligent customer interaction capabilities with seamless integration to Supabase for data management. The dashboard also displays your recent Vapi call logs with summaries and analytics for quick review.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v20 or higher recommended - as per `deploy.yml`)
- [pnpm](https://pnpm.io/installation) (v8 or higher recommended - as per `deploy.yml`)

### Cloning the Repository

```bash
git clone https://github.com/SpoqenAI/spoqen-dashboard
cd YOUR_REPOSITORY
```

<!-- TODO: Replace YOUR_USERNAME/YOUR_REPOSITORY with the actual repository URL -->

### Installation

Install the project dependencies using pnpm:

```bash
pnpm install --no-frozen-lockfile
```

### Environment Variables

This project requires certain environment variables to be set for local development and for the build process. Create a `.env.local` file in the root of your project and add the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # Or your production URL for production builds
NEXT_PUBLIC_GEOAPIFY_API_KEY=your_geoapify_api_key # Get free API key at https://www.geoapify.com/
VAPI_API_KEY=your_vapi_api_key
VAPI_PRIVATE_KEY=your_vapi_private_key
VAPI_API_URL=https://api.vapi.ai

# For GitHub Actions deployment, these are set as secrets in the repository:
# VERCEL_TOKEN
# VERCEL_ORG_ID
# VERCEL_PROJECT_ID
```

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anonymous key.
- `NEXT_PUBLIC_SITE_URL`: The canonical URL for your site. Use `http://localhost:3000` for local development.
- `NEXT_PUBLIC_GEOAPIFY_API_KEY`: Your Geoapify API key for address autocomplete functionality. Sign up for a free account at [geoapify.com](https://www.geoapify.com/).
- `VAPI_API_KEY`: API key for accessing your Vapi assistant data.
- `VAPI_PRIVATE_KEY`: Private API key used for server-side Vapi requests.
- `VAPI_API_URL`: Base URL for the Vapi API (defaults to `https://api.vapi.ai`).

The Vercel specific secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are used by the GitHub Actions workflow for deployment and should be configured as secrets in your GitHub repository settings, not in `.env.local`.

### Running the Development Server

To start the development server (usually on `http://localhost:3000`):

```bash
pnpm dev
```

## Testing

To run the test suite:

```bash
pnpm test
```

The project is configured to pass even if no tests are found (`--passWithNoTests` flag is used in CI).

## Building for Production

To create a production-ready build of the application:

```bash
pnpm build
```

This command will use the environment variables defined (e.g., in `.env.local` or CI environment) to build the static assets.

## Deployment

This project is configured for continuous deployment using GitHub Actions.

- Pushes to the `main` branch will trigger a deployment to the Vercel production environment.
- Creating a new GitHub Release will also trigger a production deployment.

The deployment workflow is defined in `.github/workflows/deploy.yml`. It handles:

1. Checking out the code.
2. Setting up Node.js and pnpm.
3. Installing dependencies.
4. Running tests.
5. Building the application (using production environment variables from GitHub Secrets).
6. Deploying to Vercel.
7. Notifying the deployment status.

Ensure the following secrets are configured in your GitHub repository settings under "Secrets and variables" > "Actions" for deployments to work:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Project Structure

```
spoqen-dashboard/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── lib/                 # Utility functions and configurations
├── hooks/               # Custom React hooks
├── styles/              # Global styles
├── public/              # Static assets
├── vercel.json          # Vercel deployment configuration
└── DEPLOYMENT.md        # Deployment documentation
```

## Contributing

Contributions are welcome! Please follow these guidelines to contribute to the project.

### Issue Tracking (Linear)

This project uses [Linear](https://linear.app) for issue tracking and project management.

- All new features, bug fixes, and tasks should have a corresponding Linear issue.
- Before starting work, ensure an issue exists or create one.
- Reference the Linear issue ID in your branch names and commit messages where appropriate.

### Branching Strategy

1.  **Main Branch**: The `main` branch is for production-ready code. Direct pushes are discouraged.
2.  **Feature Branches**: Create a new branch for each new feature or bug fix, ideally linked to a Linear issue.
    - Branch off from `main`.
    - Name your branches descriptively. Include the Linear issue ID if applicable (e.g., `ENG-123/feature-name` or `fix/ENG-456/login-bug`).
    ```bash
    # Example with Linear issue ID
    git checkout -b ENG-123/your-feature-name main
    ```
3.  **Develop on your branch**: Make your changes, commit them, and push to your remote branch.

### Commit Conventions

While not strictly enforced, consider following a convention like [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages. This helps in generating changelogs and makes the commit history more readable.

Example:

```
feat: add user profile page
fix: resolve issue with form submission
docs: update README with setup instructions
style: format code using Prettier
refactor: improve performance of data fetching
test: add unit tests for X component
chore: update dependencies
```

### Pull Requests

1.  Once your feature or fix is complete, push your branch to GitHub.
2.  Open a Pull Request (PR) against the `main` branch.
3.  Provide a clear title and description for your PR.
    - **Link to Linear Issue**: Include a link to the corresponding Linear issue in the PR description (e.g., "Fixes SPO-123" or "Relates to SPO-456"). Many PR titles can also be prefixed with the Linear issue ID.
4.  Ensure all automated checks (linters, tests, builds) pass.
5.  Collaborate with reviewers to address any feedback.
6.  Once approved, your PR will be merged into `main`.

### Coding Standards

- **Linting & Formatting**: This project uses ESLint for linting and Prettier (or ESLint-integrated Prettier) for code formatting.
  - Ensure your code adheres to the linting rules.
  - It's recommended to set up your editor to auto-format on save.
  - You can typically run `pnpm lint` and `pnpm format` (if a format script is defined in `package.json`) to check and fix issues.
