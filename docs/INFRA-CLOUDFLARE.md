# Cloudflare WAF + Bot Management — Runbook

**Ticket:** LCN-011
**Doel:** Layer-7 bescherming (DDoS, OWASP, scrapers) vóór Vercel.
**Status:** dashboard-configuratie, dit document = checklist + bewijs.

---

## 0. Voorwaarden

- DNS van `lcntships.com` (en eventuele subdomeinen) staat in Cloudflare.
- Workspace draait op Vercel, marketplace ook.
- Pakket: minimaal **Cloudflare Pro** vereist voor WAF Managed Rules + Bot Fight Mode Pro. Free-tier dekt alleen baseline DDoS en Bot Fight Mode lite.

---

## 1. Proxy aanzetten (oranje wolkje)

| Record | Type | Naam | Proxy |
|---|---|---|---|
| Workspace app | CNAME | `app` (of root) → Vercel target | 🟧 Proxied |
| Marketplace | CNAME | `www` → Vercel target | 🟧 Proxied |
| Apex (A) | A | `@` → `76.76.21.21` | 🟧 Proxied |
| MX | MX | `@` → `smtp.rzone.de` | ⬜ DNS only |

> **Let op:** SSL-mode op **Full (strict)**. Anders krijg je 525 errors zoals bij alterion.nl.

---

## 2. WAF — Managed Rules

`Security → WAF → Managed rules`:

- ✅ **Cloudflare Managed Ruleset** — actie: **Block** (default = Managed Challenge; verhogen).
- ✅ **OWASP Core Ruleset** — paranoia level **PL2**, threshold **40**.
- ✅ **Cloudflare Exposed Credentials Check** — actie: Managed Challenge.

Eerst 24u in **Log only** modus draaien, dan false-positives whitelisten via custom rule, daarna op Block zetten.

---

## 3. WAF — Custom Rules

`Security → WAF → Custom rules` — voeg toe in deze volgorde:

### 3.1 Rate-limit auth endpoints
```
(http.request.uri.path eq "/login")
or (http.request.uri.path eq "/auth/mfa-challenge")
or (http.request.uri.path matches "^/api/auth/.*")
```
- Action: **Managed Challenge**
- Rate: **5 requests per 1 minute per IP**

### 3.2 Block direct Vercel hostname
```
http.host contains "vercel.app"
```
- Action: **Block**
- Voorkomt dat Cloudflare-bypass via `*.vercel.app` werkt.

### 3.3 Geo-allow EU (optioneel, business-decisie)
```
not ip.geoip.country in {"NL" "BE" "DE" "FR" "GB" "US"}
```
- Action: **Managed Challenge**

### 3.4 Block known bad UAs
```
http.user_agent matches "(?i)(masscan|nikto|sqlmap|nuclei|gobuster|wpscan)"
```
- Action: **Block**

### 3.5 API-only origin lock
```
(http.request.uri.path matches "^/api/.*")
and not (http.referer contains "lcntships.com")
and not (cf.client.bot)
```
- Action: **Managed Challenge**
- Skip de `/api/email/webhook` en `/api/email/track` paden in een hogere prio rule (zie 3.6).

### 3.6 Whitelist publieke API's
```
(http.request.uri.path eq "/api/email/webhook")
or (http.request.uri.path eq "/api/email/track")
or (http.request.uri.path matches "^/api/email/track/.*")
```
- Action: **Skip** → Skip "All custom rules", "All managed rules", "Bot Fight Mode".
- Resend webhooks komen vanaf wisselende IP's; signature-check (LCN-009) is de echte gate.

---

## 4. Bot Management

`Security → Bots`:

- **Bot Fight Mode** → AAN (Pro+: gebruik **Super Bot Fight Mode** met categorieën Definitely Automated = Block, Likely Automated = Managed Challenge, Verified Bots = Allow).
- **JS Detections** → AAN.
- **Static Resource Protection** → AAN.

---

## 5. Page Rules / Configuration Rules

- `app.lcntships.com/*` — Browser Integrity Check **AAN**, Security Level **High**.
- `*/api/*` — Cache Level **Bypass** (anders cachet CF API-responses).
- `*/_next/static/*` — Cache Level **Cache Everything**, Edge TTL 1 maand.

---

## 6. SSL / TLS

- Mode: **Full (strict)**.
- Edge TLS minimum: **TLS 1.2**.
- Always Use HTTPS: **AAN**.
- Automatic HTTPS Rewrites: **AAN**.
- HSTS: zet via Cloudflare óf Next.js (LCN-012). Niet beide tegelijk.

---

## 7. Code-side ondersteuning

Toegevoegd in `src/lib/client-ip.ts` zodat audit-logs het echte IP loggen (CF-Connecting-IP) i.p.v. `127.0.0.1` van de proxy. Gebruik:

```ts
import { getClientIp } from '@/lib/client-ip'
const ip = getClientIp(request.headers)
```

Voor rate-limiting (LCN-013) moeten we per echt IP keyen, niet per Vercel-proxy.

---

## 8. Verificatie checklist

- [ ] `curl https://app.lcntships.com/api/leads -H 'User-Agent: sqlmap'` → **403** (rule 3.4)
- [ ] 6× snel achter elkaar POST naar `/login` vanaf één IP → **Challenge** (rule 3.1)
- [ ] Resend webhook test event → **200** (rule 3.6 skip + signature OK)
- [ ] `curl https://lcntships-workspace.vercel.app` → **403** (rule 3.2)
- [ ] WAF event log toont blocked requests in afgelopen 24u
- [ ] Bot score-distribution in Bot Analytics zichtbaar

---

## 9. Rollback

1. WAF Custom Rules → toggle off per regel (logs blijven).
2. Bot Fight Mode → uit.
3. Managed Ruleset → terug naar Log-only.
4. Proxy uitzetten alleen als laatste redmiddel (DNS-only) — kost CF-bescherming volledig.
