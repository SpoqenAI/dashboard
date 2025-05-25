# Spoqen Dashboard

*AI Receptionist for Real Estate Agents*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/veskos-projects/spoqen-dashboard)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

## Overview

Spoqen Dashboard is an AI-powered receptionist system designed specifically for real estate agents. This Next.js application provides intelligent customer interaction capabilities with seamless integration to Supabase for data management.

## Deployment

Your project is live at:

**[https://spoqen-dashboard.vercel.app](https://spoqen-dashboard.vercel.app)**

## Tech Stack

- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Database**: Supabase
- **Deployment**: Vercel
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd spoqen-dashboard
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your Supabase credentials in `.env.local`

5. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

This project uses Vercel for continuous deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.

### Automatic Deployments

- **Production**: Deploys automatically from `main` branch
- **Preview**: Deploys automatically from feature branches
- **Environment Variables**: Configured in Vercel dashboard

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

1. Create a feature branch from `main`
2. Make your changes
3. Test locally
4. Create a pull request
5. Deploy automatically via Vercel

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md) or contact the development team.
