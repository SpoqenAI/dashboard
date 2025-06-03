# Vercel Deployment Guide

This guide explains the automated Vercel deployment setup for this project, implementing the workflow described in [this GitHub gist](https://gist.github.com/ky28059/1c9af929a9030105da8cf00006b50484).

## Overview

This repository is configured to automatically deploy to Vercel using GitHub Actions, allowing you to deploy from an organization repository without requiring Vercel's paid team plan.

## Deployment Workflows

### 1. Production Deployment (`vercel-deploy.yml`) ✅ ACTIVE

**Triggers:** Push to `main` branch or published releases

This workflow:
- Sets environment variables in Vercel
- Deploys to production using Vercel's build process
- Creates deployment status updates
- Follows the gist's recommended pattern of letting Vercel handle the build

### 2. Preview Deployments (`vercel-preview.yml`) ✅ ACTIVE

**Triggers:** Pull requests to `main` branch

This workflow:
- Creates preview deployments for every pull request
- Posts preview URL as a comment on the PR
- Updates the comment when new commits are pushed
- Helps with code review and testing

### 3. Legacy Deployment (`deploy.yml`) ❌ DISABLED

**Status:** Disabled but kept for reference

This was the original deployment workflow that:
- Built the project locally in GitHub Actions
- Ran tests and validations before deployment
- Then deployed to Vercel
- Provided more control over the build process

*This workflow has been replaced by `vercel-deploy.yml` for better alignment with the gist's recommendations.*

## Required Secrets

The following secrets must be configured in your GitHub repository settings:

### Vercel Configuration
- `VERCEL_TOKEN` - Your Vercel account token ([create here](https://vercel.com/account/tokens))
- `VERCEL_ORG_ID` - Your organization ID from `.vercel/project.json`
- `VERCEL_PROJECT_ID` - Your project ID from `.vercel/project.json`

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXT_PUBLIC_SITE_URL` - Your production site URL

## Setup Instructions

### 1. Vercel Project Setup

Your project is already linked to Vercel with the following configuration:
```json
{
  "projectId": "[REDACTED_PROJECT_ID]",
  "orgId": "[REDACTED_ORG_ID]"
}
```

### 2. GitHub Secrets Configuration

1. Go to your repository Settings → Secrets and variables → Actions
2. Add the following repository secrets:
   - `VERCEL_TOKEN`: Create at https://vercel.com/account/tokens
   - `VERCEL_ORG_ID`: `[REDACTED_ORG_ID]`
   - `VERCEL_PROJECT_ID`: `[REDACTED_PROJECT_ID]`
   - Add your environment variables as listed above

### 3. Current Deployment Strategy

**✅ Active Approach: Vercel-Handled Build**
Using `vercel-deploy.yml` - follows the gist's pattern exactly:
- Faster deployment process
- Vercel handles the build optimization
- Environment variables set via Vercel API
- Recommended approach from the gist

**❌ Legacy Approach: GitHub Actions Build**
The previous `deploy.yml` workflow has been disabled:
- Previously built the project locally in GitHub Actions
- Ran tests before deployment
- More control over build process
- Kept for reference and potential rollback

## Features

### Preview Deployments
- 🚀 Automatic preview URLs for all pull requests
- 💬 Preview URL posted as PR comment
- 🔄 Updates automatically on new commits
- 🧪 Perfect for testing and code review

### Production Deployments
- ✅ Automatic deployment on main branch pushes
- 🏷️ Support for release-based deployments
- 📊 Deployment status tracking
- 🔔 Notification system for deployment results
- ⚡ Optimized build process handled by Vercel

### Security
- ✅ Proper permissions configured to avoid integration errors
- 🔒 Environment variables securely managed
- 🛡️ Separation between preview and production environments

## Troubleshooting

### "Resource not accessible by integration" Error
This error is resolved by the proper `permissions` configuration in the workflow files:
```yaml
permissions:
  contents: read
  pull-requests: write
  deployments: write
```

### Environment Variables Not Available
If environment variables aren't available in Vercel:
1. Check that all secrets are properly configured in GitHub
2. Verify the `projectName` in the `vercel-set-env-action` step matches your Vercel project name
3. Ensure the `vercel-set-env-action` runs before the deployment step

### Preview Deployment Issues
- Check that the `VERCEL_TOKEN` has access to create deployments
- Verify the `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Ensure the repository has the correct permissions

### Switching Back to Legacy Workflow
If you need to switch back to the legacy GitHub Actions build approach:
1. Disable `vercel-deploy.yml` by adding `if: false` to the jobs
2. Re-enable `deploy.yml` by:
   - Changing the trigger from `workflow_dispatch` to the original triggers
   - Removing the `if: false` conditions
   - Updating the workflow name

## Benefits of Current Setup

1. **Cost Effective**: Deploy from organization repositories without Vercel team costs
2. **Automated**: No manual deployment steps required
3. **Testing**: Preview deployments for every PR
4. **Optimized**: Vercel handles build optimization and caching
5. **Reliable**: Proper error handling and status reporting
6. **Fast**: Streamlined deployment process without local build steps

## Related Documentation

- [Original GitHub Gist](https://gist.github.com/ky28059/1c9af929a9030105da8cf00006b50484)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [amondnet/vercel-action](https://github.com/amondnet/vercel-action)
- [GitHub Actions Documentation](https://docs.github.com/en/actions) 