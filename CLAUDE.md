# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

lcntships-workspace is an internal SaaS dashboard for managing a creative studio rental marketplace. It handles lead generation/scraping, email campaigns, bookings, finance, and marketing — all backed by a shared Supabase database that also powers the public-facing website.

## Commands

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build
- `npm run lint` — ESLint
- No test runner is configured

## Architecture

**Next.js 16 App Router** with React 19. TypeScript strict mode.

### Route Groups
- `src/app/(workspace)/` — All authenticated dashboard pages:
  - `dashboard`, `studios`, `bookings`, `email`, `scraper`, `marketing`, `finance`
  - `analytics`, `customers`, `documents`, `enrichment`, `partners`, `sales`, `settings`, `upload`
- `src/app/(auth)/` — Login page
- `src/app/api/` — API routes (middleware skips these, no auth check):
  - `csv`, `email`, `enrich-lead`, `invoices`, `leads`, `search-leads`

### Supabase
- **Project ID**: `ytmkmiofoluespwysfxa`
- **Server client**: `src/lib/supabase/server.ts` — uses `cookies()`, for Server Components and API routes
- **Browser client**: `src/lib/supabase/client.ts` — for Client Components
- **Middleware**: `src/lib/supabase/middleware.ts` — session refresh on page routes
- **Types**: `src/types/database.ts` — auto-generated Database type, used to type both clients
- Key tables: `sales_leads`, `sent_emails`, `email_tracking`, `studios`, `bookings`, `partners`, `customers`, `transactions`, `marketing_posts`, `documents`

### Email System
- **Resend** is the primary email provider (`RESEND_API_KEY`)
- Templates in `src/emails/` use React Email
- Bulk sending uses 100ms delay between emails for rate limiting
- Email tracking via 1x1 pixel (open) and redirect (click) through `/api/email/track`
- IMAP sync support for reading inbox replies
- `sent_emails` table stores `resend_id` and `last_event` (delivered/bounced/sent/failed)

### External Services
- **Apollo.io** — lead enrichment (`APOLLO_API_KEY`)
- **SerpAPI** — Google Maps scraping for lead discovery (`SERPAPI_KEY`)
- **Anthropic Claude** — CSV analysis via Haiku model (`ANTHROPIC_API_KEY`)
- **Puppeteer** — PDF generation for invoices

### UI Stack
- **Tailwind CSS 4** via `@tailwindcss/postcss` (no tailwind.config — uses CSS-based config)
- **shadcn/ui** components in `src/components/ui/` (Radix primitives + `cn()` utility)
- **Lucide React** for icons
- **Recharts** for data visualization
- `cn()` helper from `src/lib/utils.ts` (clsx + tailwind-merge)

### Additional Libraries
- **@tanstack/react-query** — server state management and caching
- **react-hook-form** + **zod** — form handling and validation
- **date-fns** — date formatting and manipulation
- **papaparse** — CSV parsing
- **dompurify** — HTML sanitization (XSS protection)
- **imap-simple** + **mailparser** — IMAP email sync
- **nodemailer** — outbound email (alongside Resend)
- **@sparticuz/chromium** + **puppeteer** — serverless PDF generation

### Key Patterns
- Pages are Client Components (`"use client"`) that fetch data via Supabase browser client
- API routes use the Supabase server client or direct service SDKs (Resend, Apollo)
- Email campaign flow is a multi-step wizard: SelectLeads → WriteEmail → ReviewSend (`src/components/email-campaign/`)
- Layout uses a collapsible sidebar (`src/components/layout/Sidebar.tsx`)
- Component directories mirror workspace pages: `bookings/`, `dashboard/`, `email-campaign/`, `finance/`, `partners/`, `sales/`, `studios/`
- `src/lib/api-auth.ts` — API route authentication helper
- `src/lib/imap-validation.ts` — IMAP connection validation

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
SERPAPI_KEY
APOLLO_API_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
```
