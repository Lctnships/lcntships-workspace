# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

lcntships-workspace is an internal SaaS dashboard for managing a creative studio rental marketplace. It handles lead generation/scraping, email campaigns, bookings, finance, marketing, and content production. Backed by **two** Supabase projects (see Database) plus Resend, Apollo.io, SerpAPI, and Anthropic Claude.

**Live URL:** https://workspace.lctnships.com (production, branch `main`)
**Git branches:** `main` (prod) · `development` (staging) · feature branches

## Commands

- `npm run dev` — Start dev server (Turbopack, http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — Type check (run this after TS changes)
- `npx playwright test` — E2E tests (see `tests/e2e/`)

## Architecture

**Next.js 16 App Router** with React 19, TypeScript strict mode, Turbopack bundler.

### Route Groups
- `src/app/(workspace)/` — Authenticated dashboard:
  - `dashboard`, `studios`, `bookings`, `email`, `scraper`, `marketing`, `finance`, `analytics`, `customers`, `documents`, `enrichment`, `partners`, `sales`, `settings`, `upload`, `content`
  - `marketing/agenda` — productie-agenda poll (LCN-014)
- `src/app/(auth)/` — `login`, `signup`, `mfa-challenge`
- `src/app/p/[token]/` — Publieke stem-pagina voor productie-agenda (geen auth)
- `src/app/api/` — API routes (auth enforced in `src/middleware.ts`):
  - `csv`, `email`, `enrich-lead`, `invoices`, `leads`, `search-leads`, `team`, `mfa`, `productions`, `workspace/query`

### Database — Twee Supabase projecten (LET OP!)

**Main** (`ytmkmiofoluespwysfxa`) — gedeeld met de publieke marketplace:
- `auth.users`, `profiles`, `studios`, `bookings`, `partners`, `transactions`
- Client: `src/lib/supabase/{server,client,middleware}.ts`
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Workspace** (`xiuplzawiionroxgwvsa`) — **alleen workspace data, gesplitst op 2026-04-13**:
- `sales_leads`, `lead_contacts`, `lead_activities`, `sales_agenda`
- `email_accounts`, `email_templates`, `sent_emails`, `email_outbox` (LCN-016), `email_tracking`
- `productions`, `production_votes` (LCN-014), `mfa_recovery_codes` (LCN-015)
- `content_briefs`, `content_templates`, `upload_links`, `uploaded_files`, `portfolio_items`, `briefings`, `briefing_responses`
- `team_members`, `customers`, `marketing_posts`, `search_history`, `serpapi_usage`
- **Server-only** client: `src/lib/supabase/workspace.ts` (service role)
- **Browser proxy**: `src/lib/workspace-client.ts` → `/api/workspace/query` route
- Env: `WORKSPACE_SUPABASE_URL`, `WORKSPACE_SUPABASE_SERVICE_ROLE_KEY`
- **Cross-project FK pitfall**: tabellen hier mogen GEEN `references auth.users(id)` hebben — `auth.users` staat in main project. We hebben dat al 2x gefixt (LCN-016b drop outbox FK).

### Email System — Outbox pattern (LCN-016)

- **Alle outgoing mail loopt via `src/lib/email-outbox.ts` → `sendViaOutbox()`**
- Elke intent wordt eerst als row in `email_outbox` opgeslagen (status='pending'), daarna pas Resend aangeroepen. Bij fail: row blijft staan met `last_error` — retry via Settings UI of `/api/email/outbox/[id]/retry`.
- Mirror naar `sent_emails` voor backwards-compat met "Verzonden" folder in UI
- Templates in `src/emails/` (React Email)
- Tracking: 1x1 pixel (open) + redirect (click) via `/api/email/track` (public, geen auth)
- IMAP inbox sync via `imap-simple` + `mailparser`
- Resend webhook (`/api/email/webhook`) vereist HMAC signature in productie (LCN-009)
- Health check knop in Settings (stuurt test naar Rivaldo/Uriel)

### MFA / Security

- **MFA currently OFF on main** — toggle via env var `MFA_ENFORCEMENT=on`
- Middleware check: `src/lib/supabase/middleware.ts` (regel 99-120)
- Bypass routes: `/login`, `/signup`, `/mfa-challenge`, `/settings/security/mfa-enroll`, `/api/*`, `/p/*`
- Recovery codes (LCN-015): 10 stuks, SHA-256 gehasht in `mfa_recovery_codes`
- Challenge pagina heeft "Gebruik recovery code" fallback → consume → factor gereset → user moet opnieuw enrollen
- Security stack: rate-limiting (LCN-013), Zod validatie (LCN-007), SSRF guard (LCN-006), DOMPurify XSS (LCN-005), per-route `requireAuth()` (LCN-003), Cloudflare WAF (LCN-011), CSP + HSTS (LCN-012), hard-fail op missing secrets (LCN-008)

### External Services
- **Resend** — email provider (`RESEND_API_KEY`), webhook secret `RESEND_WEBHOOK_SECRET`
- **Apollo.io** — lead enrichment (`APOLLO_API_KEY`)
- **SerpAPI** — Google Maps scraping (`SERPAPI_KEY`)
- **Anthropic Claude** — CSV analysis via Haiku (`ANTHROPIC_API_KEY`)
- **Puppeteer + @sparticuz/chromium** — invoice PDF generation
- **Upstash Redis** (optioneel) — distributed rate-limiting (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Zonder: in-memory fallback per instance.

### UI Stack
- **Tailwind CSS 4** via `@tailwindcss/postcss` (geen `tailwind.config`, CSS-based)
- **shadcn/ui** in `src/components/ui/` (Radix primitives + `cn()` util)
- **Lucide React** icons
- **Recharts** voor data viz
- `cn()` helper: `src/lib/utils.ts` (clsx + tailwind-merge)

### Additional Libraries
- **@tanstack/react-query** — server state
- **react-hook-form** + **zod** — form handling + validatie
- **date-fns** — date handling (met `nl` locale)
- **papaparse** — CSV parsing
- **dompurify** — HTML sanitization
- **imap-simple** + **mailparser** — inbox sync
- **nodemailer** — outbound (naast Resend)
- **resend** + **@react-email/components** — email templates

### Key Patterns
- Pages zijn Client Components (`"use client"`) die via `workspaceClient` (proxy) naar workspace DB praten
- Server-side kan `workspaceDb` (service role) rechtstreeks gebruikt worden — NOOIT importeren in Client Components
- Email campaign wizard: `SelectLeads → WriteEmail → ReviewSend` (`src/components/email-campaign/`)
- Collapsible sidebar: `src/components/layout/Sidebar.tsx` — secties Dashboard, Business, Sales, Marketing & Content, System
- Component dirs mirror workspace pages: `bookings/`, `dashboard/`, `email-campaign/`, `finance/`, `partners/`, `sales/`, `studios/`, `email/`, `mfa/`
- `src/lib/api-auth.ts` — `requireAuth()` helper
- `src/lib/with-rate-limit.ts` — wrap API handlers voor per-IP rate limiting

## Environment Variables

Required in `.env.local` **and** Vercel (alle environments tenzij anders aangegeven):

```
# Main Supabase project (gedeeld met public website)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Workspace Supabase project (workspace-only data)
WORKSPACE_SUPABASE_URL
WORKSPACE_SUPABASE_SERVICE_ROLE_KEY

# External services
RESEND_API_KEY
RESEND_WEBHOOK_SECRET          # Resend → Webhooks → Signing Secret (prod only)
RESEND_FROM                    # optioneel, default: rivaldomacandrew@lctnships.com
APOLLO_API_KEY
SERPAPI_KEY
ANTHROPIC_API_KEY

# App
NEXT_PUBLIC_APP_URL            # http://localhost:3000 in dev, https://workspace.lctnships.com in prod

# Feature flags
MFA_ENFORCEMENT                # omitted/anything-but-'on' = off (default). Set to 'on' to enforce MFA.

# Rate limiting (optioneel)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

**Tip:** `vercel env pull .env.local` trekt alle Vercel vars binnen één commando.

**Vercel preview deployments** vereisen dat `NEXT_PUBLIC_SUPABASE_URL` + `_ANON_KEY` zijn aangevinkt voor **Preview** environment — anders faalt `/settings` prerender.

## Migraties — toegepast in productie

Draaien op workspace project (`xiuplzawiionroxgwvsa`) tenzij anders vermeld. Bestanden in `supabase/migrations/`:

- `001_create_customers_table.sql`
- `20260306232111_add_email_and_finance_tables.sql`
- `20260307010000_add_sent_emails_table.sql`
- `20260307113201_add_sent_emails_table.sql`
- `20260328_create_team_members.sql`
- `20260415_lcn_004_rls_tighten_workspace_tables.sql`
- `20260418_lcn_014_production_agenda_polls.sql` — productions + production_votes
- `20260418_lcn_015_mfa_recovery_codes.sql` — MFA back-up codes
- `20260419_lcn_014b_deadline_unique_voter.sql` — deadline + anti-dupl voter
- `20260420_lcn_014c_voter_email.sql` — voter_email kolom
- `20260420_lcn_016_email_outbox.sql` — email outbox tabel
- `20260420_lcn_016b_drop_outbox_user_fk.sql` — drop cross-project FKs

**Altijd na DDL:** meteen de migratie toepassen in Supabase (MCP of SQL editor). Nooit aannemen dat user 't doet.

## Tickets — historisch overzicht

**Fase 1 (security):** LCN-001 t/m LCN-008 — middleware auth, per-route requireAuth, RLS tightening, DOMPurify XSS, SSRF guard, Zod validation, hard-fail secrets
**Fase 2 (security):** LCN-009 t/m LCN-013 — webhook signing, MFA enrolling, Cloudflare WAF, CSP headers, rate-limiting
**Fase 3 (features):**
- **LCN-014** — Productie-agenda poll (publieke stem-link `/p/[token]`, multi-select datums, deadline auto-close, anti-duplicate voter, email notify finale datum)
- **LCN-015** — MFA recovery codes + device reset + admin MFA-status view op Team
- **LCN-016** — Email outbox pattern (nooit meer stil emails verliezen, retry vanuit UI)

Open handwerk in `ACTIONS-REQUIRED.md`.

## Incident log

- **2026-04-13** — Workspace DB gesplitst. Daarna 10 dagen emails kapot (workspaceDb env vars ontbraken op Vercel + `.env.local`). Gefixt 2026-04-20 samen met outbox pattern zodat dit nooit meer stil kan falen.
- **2026-04-20** — Sales Pipeline status-updates werden stil genegeerd (`workspaceClient.select()` overschreef `op` van update naar select). Gefixt. 2 verloren statussen handmatig hersteld in DB (Fotostudio 344 → negotiation, Studioshoots.nl → lost).

## Code quality gates

- Run `npx tsc --noEmit` na TypeScript wijzigingen
- Run `npm run lint` na grotere changes
- UI-changes: dev server draaien + visueel testen voor afronden
- Email changes: altijd testen via Settings → Email pipeline test (stuurt naar Rivaldo/Uriel, niet naar klanten)
- Mobile-only of desktop-only per ticket — niet mengen

## Workflow

- **Branch per ticket:** `feat/LCN-XX-slug` of `fix/XX-slug` vanaf `development`
- **Conventional commits:** `feat(scope): ...`, `fix(scope): ...`, etc.
- **Commit + push** zodra feature werkt + types slagen
- **PR openen en mergen alleen na expliciete toestemming** — "commit en push" ≠ PR mergen
- **Nooit** `--no-verify` of `--no-gpg-sign` zonder expliciete toestemming
- **Nooit** force push naar main/master
- Migraties draaien we meteen na code-change, niet later
