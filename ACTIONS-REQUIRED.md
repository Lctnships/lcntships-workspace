# Actions Required — handmatige stappen per ticket

**Doel:** alles wat ik (Claude) niet automatisch kan doen, op één plek.
Update-regel: bij elk ticket waar handwerk nodig is, voeg ik een sectie toe.
Vink af zodra het is gedaan.

**Laatst bijgewerkt:** 2026-04-16

---

## 🔴 Open — vereist actie

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

## 🟢 Done — historisch overzicht

*(leeg tot eerste afvinking)*

---

## 📋 Conventies

- Acties krijgen een ticket-ID (LCN-XXX) zodat ze terug te vinden zijn.
- Iedere bullet is afvinkbaar.
- Verwijder een sectie nooit — verplaats hem naar **Done** zodat de geschiedenis intact blijft.
- Als een actie urgent is voor productie-deploy, markeer met 🚨.
