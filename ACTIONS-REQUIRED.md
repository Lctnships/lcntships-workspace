# Actions Required — handmatige stappen per ticket

**Doel:** alles wat ik (Claude) niet automatisch kan doen, op één plek.
Update-regel: bij elk ticket waar handwerk nodig is, voeg ik een sectie toe.
Vink af zodra het is gedaan.

**Laatst bijgewerkt:** 2026-04-16

---

## 🔴 Open — vereist actie

### LCN-013 — Rate-limiting (optioneel: distributed via Upstash)
- [ ] **Optioneel** — voor distributed rate-limiting over alle Vercel instances, Upstash Redis instellen:
  - Maak een gratis Upstash Redis DB aan op https://upstash.com
  - Kopieer `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN`
  - Op **Vercel → Project → Settings → Environment Variables** toevoegen (alle environments):
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
  - Redeploy.
- **Waarom:** zonder Upstash valt de rate-limiter terug op een in-memory Map die **per-instance** is. Op Vercel (multi-lambda) kunnen aanvallers dit omzeilen door verschillende instances te raken. Voor echt effectieve bescherming → Upstash zetten.
- **Skip:** `/api/email/webhook` (Resend callback) en `/api/email/track` (tracking pixel) zijn bewust niet rate-limited.

### LCN-008 — Hard-fail missing secrets
- [ ] Op **Vercel → Project → Settings → Environment Variables** zetten (alle environments):
  - `SUPABASE_SERVICE_ROLE_KEY` — uit Supabase project `ytmkmiofoluespwysfxa` → Settings → API → service_role
  - `WORKSPACE_SUPABASE_URL` — workspace project URL
  - `WORKSPACE_SUPABASE_SERVICE_ROLE_KEY` — workspace service role
- [ ] Redeploy na toevoegen.
- **Waarom:** zonder service-role key faalt `/api/team/invite`, `/api/team` (admin-tak), en alle workspaceDb-routes (500).

### LCN-009 — Resend webhook signature
- [ ] Op **Resend → Webhooks** een endpoint aanmaken (of bestaande pakken):
  - URL: `https://app.lcntships.com/api/email/webhook`
  - Events: alle `email.*`
- [ ] Kopieer de **Signing Secret** (`whsec_…`).
- [ ] Op Vercel als env var: `RESEND_WEBHOOK_SECRET=whsec_…` (Production + Preview).
- [ ] Redeploy.
- **Waarom:** in production faalt de webhook-route met 500 zonder dit secret (LCN-008/009 hard-fail).

### LCN-010 — MFA verplicht
- [ ] **Voor jezelf:** ga na deploy direct naar `/settings/security/mfa-enroll`, scan de QR met je authenticator-app (1Password / Authy / Google Authenticator), voer de 6-cijferige code in, bewaar de secret als backup.
- [ ] Doe hetzelfde voor Jamal en alle overige team_members.
- [ ] **Recovery / lockout-failsafe:** voeg op Vercel env var `MFA_ENFORCEMENT=off` toe alleen als je iemand wilt unblocken. Direct daarna weer verwijderen.
- **Waarom:** zonder enrollment word je gedwongen naar de enroll-pagina; zonder app kun je niet meer inloggen.

### LCN-011 — Cloudflare WAF + bot-management
- [ ] Loop `docs/INFRA-CLOUDFLARE.md` punt-voor-punt door in Cloudflare dashboard.
  - SSL mode → **Full (strict)**
  - WAF Managed Ruleset eerst **Log-only** 24u, dan **Block**
  - OWASP CRS op **PL2 / threshold 40**
  - Custom rules 3.1 t/m 3.6 toevoegen
  - Bot Fight Mode (of Super Bot Fight Mode op Pro+) AAN
- [ ] Verificatie-curls uit §8 van het runbook draaien en uitkomsten loggen.
- [ ] **Optioneel maar aangeraden:** upgrade Cloudflare naar Pro (ca. $20/mo) voor full Managed Ruleset + Super Bot Fight Mode.

---

### LCN-012 — CSP + HSTS + security headers
- [ ] Na deploy: open `https://app.lcntships.com` in DevTools → Console. Check op CSP-violations (rode errors). Veelvoorkomend: third-party script of font niet in whitelist.
- [ ] Voeg eventuele extra origins toe aan `next.config.ts` → `cspDirectives` (bv. analytics, error-tracker).
- [ ] HSTS preload: registreer domein op https://hstspreload.org/ pas **nadat** je 100% zeker bent dat alle subdomeinen HTTPS-only zijn (preload is moeilijk terug te draaien).
- [ ] Als Cloudflare ook HSTS injecteert: zet één van beide uit (dubbele headers = browser kiest één, kan inconsistent zijn). Voorkeur: laat Next.js het doen.
- [ ] Test scoring op https://securityheaders.com/?q=app.lcntships.com → mikken op A+.

---

## 🟢 Done — historisch overzicht

*(leeg tot eerste afvinking)*

---

## 📋 Conventies

- Acties krijgen een ticket-ID (LCN-XXX) zodat ze terug te vinden zijn.
- Iedere bullet is afvinkbaar.
- Verwijder een sectie nooit — verplaats hem naar **Done** zodat de geschiedenis intact blijft.
- Als een actie urgent is voor productie-deploy, markeer met 🚨.
