# Deployment Guide - Vercel CI/CD

This document outlines the Vercel deployment setup for the Spoqen Dashboard project.

## Prerequisites

- Vercel account
- GitHub repository access
- Supabase project credentials

## Environment Variables

The following environment variables need to be configured in Vercel:

### Required Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_SITE_URL`: Your production domain (automatically set by Vercel)

## Vercel Setup Instructions

### 1. Link Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository: `spoqen-dashboard`

### 2. Configure Build Settings

Vercel will automatically detect this as a Next.js project. The following settings are configured in `vercel.json`:

- **Framework**: Next.js
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`
- **Dev Command**: `pnpm dev`
- **Output Directory**: `.next` (automatic)

### 3. Environment Variables Setup

In your Vercel project settings:

1. Go to "Settings" → "Environment Variables"
2. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (optional, Vercel sets this automatically)

### 4. Deployment Configuration

- **Production Branch**: `main`
- **Preview Deployments**: Enabled for all branches
- **Automatic Deployments**: Enabled

## Security Headers

The following security headers are configured in `vercel.json`:

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Deployment Process

1. Push changes to any branch → Preview deployment
2. Merge to `main` branch → Production deployment
3. All deployments are automatic and include:
   - Build optimization
   - Static asset optimization
   - Edge function deployment
   - Global CDN distribution

## Monitoring

- Build logs available in Vercel dashboard
- Runtime logs for debugging
- Performance analytics
- Core Web Vitals monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**: Check build logs in Vercel dashboard
2. **Environment Variables**: Ensure all required variables are set
3. **Supabase Connection**: Verify Supabase URL and keys are correct

### GitHub CI/CD Integration

This project includes comprehensive GitHub Actions workflows for automated testing and deployment:

### Workflows

1. **CI Workflow** (`.github/workflows/ci.yml`)

   - Runs on push to `main`/`develop` and all PRs
   - Tests on Node.js 18.x and 20.x
   - Performs linting, type checking, and builds
   - Security audits and vulnerability checks

2. **PR Validation** (`.github/workflows/pr-validation.yml`)

   - Validates all pull requests
   - Code formatting checks
   - Bundle size analysis
   - Automated PR comments with results

3. **Deployment** (`.github/workflows/deploy.yml`)

   - Deploys to production on `main` branch pushes
   - Integrates with Vercel deployment
   - Creates deployment status updates

4. **Dependency Updates** (`.github/workflows/dependency-update.yml`)
   - Weekly automated dependency updates
   - Security vulnerability fixes
   - Automated PR creation for updates

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### Branch Protection Rules

Recommended branch protection settings for `main`:

- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators in restrictions

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- GitHub Actions: https://docs.github.com/en/actions
