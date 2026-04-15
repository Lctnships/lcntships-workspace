# Tickets — lcntships-workspace

**Bron:** `REPORT.md` + `SECURITY-REPORT.md`
**Laatst bijgewerkt:** 2026-04-15
**Totaal:** 52 tickets
**Prefix:** `LCN-XXX` (sequentieel)

---

## 📊 Dashboard

```
🔴 Kritiek (P0)   [████████████████████]  5 / 5
🟠 Hoog (P1)      [█████░░░░░░░░░░░░░░░]  5 / 20
🟡 Medium (P2)    [░░░░░░░░░░░░░░░░░░░░]  0 / 23
🟢 Laag (P3)      [█████░░░░░░░░░░░░░░░]  1 / 4
─────────────────────────────────────────────
TOTAAL            [████░░░░░░░░░░░░░░░░]  11 / 52 (21%)
```

| Categorie | Totaal | 🟢 Done | 🟡 Partial | ⚪ Todo |
|---|---:|---:|---:|---:|
| Security (P0) | 5 | 5 | 0 | 0 |
| Security (P1 hardening) | 4 | 0 | 0 | 4 |
| Security IAM & Crypto | 7 | 0 | 0 | 7 |
| Security SDLC & AppSec | 9 | 0 | 0 | 9 |
| Security Ops/GRC/Privacy | 12 | 0 | 0 | 12 |
| Architectuur | 5 | 0 | 0 | 5 |
| Performance | 3 | 0 | 0 | 3 |
| Tests & tooling | 3 | 0 | 0 | 3 |
| Code quality | 4 | 1 | 0 | 3 |

**Legenda status:** 🟢 Done · 🟡 Partial · ⚪ Todo · 🔵 Blocked · ⚫ Cancelled
**Legenda prioriteit:** 🔴 Kritiek · 🟠 Hoog · 🟡 Medium · 🟢 Laag
**Types:** 🔒 Security · 🔧 Refactor · ⚡ Perf · ✅ Test · 📚 Docs · 🐛 Bug · 🎚️ Feature

---

## 🔴 KRITIEK — Fase 1 Security Lockdown

| ID | Type | Titel | Component | OWASP | Effort | Status |
|---|---|---|---|---|---|---|
| **LCN-001** | 🔒 | Middleware auth voor `/api/*` | Backend | A01 | 2u | 🟢 |
| **LCN-002** | 🔒 | `/api/team/invite` achter admin-role, geen tempPassword in response | Backend | A01/A07 | 2u | 🟢 |
| **LCN-003** | 🔒 | `/api/leads` + alle data-routes dichtzetten met `requireAuth()` | Backend | A01 | 2u | 🟢 |
| **LCN-004** | 🔒 | RLS `qual='true'` vervangen door `authenticated` (9 tabellen) | DB | A01 | 1d | 🟢 |
| **LCN-005** | 🔒 | DOMPurify in `CampaignReviewSend.tsx:507` | Frontend | A03 | 30m | 🟢 |

<details>
<summary><b>LCN-001 — Middleware auth voor `/api/*`</b> (klik voor detail)</summary>

- **File:** `src/middleware.ts:7-9`
- **Risico:** Middleware skipt `/api/*` → 26/30 routes publiek; `curl /api/leads` dumpt 500 records
- **Fix-plan:**
  1. Middleware matcher uitbreiden zodat `/api/*` óók wordt afgehandeld
  2. Publieke allowlist: `/api/email/webhook`, `/api/email/track`
  3. Per route verifiëren dat auth-guard aanwezig is
- **Acceptance:**
  - [ ] `curl /api/leads` → 401
  - [ ] `curl /api/email/webhook` → 200/400 (ongewijzigd)
  - [ ] PR-body bevat routes-inventaris "protected / publiek (reden)"
- **Branch:** `security/LCN-001-middleware-api-auth`

</details>

---

## 🟠 HOOG — Fase 2 Security Hardening

| ID | Type | Titel | Component | OWASP | Effort | Status |
|---|---|---|---|---|---|---|
| **LCN-006** | 🔒 | SSRF-guard op `enrich-lead` (block private IP-ranges) | Backend | A10 | 2u | 🟢 |
| **LCN-007** | 🔒 | Zod-schemas op alle POST/PATCH routes | Backend | A04 | 1d | 🟢 |
| **LCN-008** | 🔒 | Hard-fail op missing secrets i.p.v. anon-key fallback | Backend | A05 | 2u | 🟢 |
| **LCN-009** | 🔒 | Resend webhook signature verplicht in prod | Backend | A08 | 30m | 🟢 |

---

## 🟠 HOOG — Fase 3 Bank-level IAM & Cryptografie

| ID | Type | Titel | Component | Std | Effort | Status |
|---|---|---|---|---|---|---|
| **LCN-010** | 🔒 | MFA verplicht voor alle team_members | Backend | A07/ISO A.9 | 1d | 🟢 |
| **LCN-011** | 🔒 | WAF + bot-management via Cloudflare | Infra | A05 | 2u | ⚪ |
| **LCN-012** | 🔒 | Strict CSP + HSTS preload + security headers | Frontend | A05 | 2u | ⚪ |
| **LCN-013** | 🔒 | Rate-limiting op auth + write-endpoints | Backend | A04 | 1d | ⚪ |
| **LCN-014** | 🔒 | Immutable `audit_log` tabel (INSERT-only) | DB | A09/SOC2 CC7 | 1d | ⚪ |
| **LCN-015** | 🔒 | Field-level encryption (pgsodium) voor IMAP-passwords | DB | A02 | 1d | ⚪ |
| **LCN-016** | 🔒 | Session-beleid (device-fingerprint, IP-change, concurrent limit) | Backend | A07 | 1d | ⚪ |

---

## 🟠 HOOG — Fase 4 Secure SDLC & AppSec

| ID | Type | Titel | Component | Std | Effort | Status |
|---|---|---|---|---|---|---|
| **LCN-017** | 🔒 | Gitleaks secrets-scanning (pre-commit + CI) | CI/CD | ASVS V14 | 2u | ⚪ |
| **LCN-018** | 🔒 | SAST (Semgrep/CodeQL) in CI | CI/CD | ASVS V14 | 2u | ⚪ |
| **LCN-019** | 🔒 | SCA blocking high/crit (Snyk + Dependabot) | CI/CD | A06 | 2u | ⚪ |
| **LCN-020** | 🔒 | Signed commits (GPG/SSH) verplicht | CI/CD | ISO A.14 | 2u | ⚪ |
| **LCN-021** | 🔒 | Branch protection + CODEOWNERS | CI/CD | ISO A.14 | 30m | ⚪ |
| **LCN-022** | 🔒 | CSP nonce per request | Frontend | A03 | 1d | ⚪ |
| **LCN-023** | 🔒 | Prompt-injection defense (Claude enrichment) | Backend | LLM-OWASP | 1d | ⚪ |
| **LCN-024** | 🔒 | SBOM generation (Syft) in CI | CI/CD | SOC2 CC7 | 2u | ⚪ |
| **LCN-025** | 🔒 | DAST baseline (OWASP ZAP) weekly | CI/CD | ASVS V14 | 1d | ⚪ |

---

## 🟡 MEDIUM — Fase 5 Ops, GRC & Privacy

| ID | Type | Titel | Component | Std | Effort | Status |
|---|---|---|---|---|---|---|
| **LCN-026** | 🔒 | Backup-verify + quarterly DR-drill | Infra | ISO A.17 | 1d | ⚪ |
| **LCN-027** | 📊 | SIEM + anomaly-detection + alerts | Infra | SOC2 CC7 | 3d | ⚪ |
| **LCN-028** | 📊 | Structured logging (Pino) + correlation-id | Backend | A09 | 2u | ⚪ |
| **LCN-029** | 🔒 | 4-eyes principe destructieve admin-acties | Backend | ISO A.9 | 1d | ⚪ |
| **LCN-030** | 🔒 | DMARC/DKIM/SPF strikt op `lcntships.com` | Infra | NIST | 2u | ⚪ |
| **LCN-031** | 🔒 | SSO via IdP (optioneel) | Backend | ISO A.9 | 1d | ⚪ |
| **LCN-032** | 🔒 | JIT privileged access (`role_elevations`) | DB | ISO A.9 | 1d | ⚪ |
| **LCN-033** | 📚 | Vendor DPA audit + bewijzen | Docs | AVG 28 | 2u | ⚪ |
| **LCN-034** | 🔒 | Data-subject export/delete endpoints | Backend | AVG 15/17/20 | 1d | ⚪ |
| **LCN-035** | 📚 | AVG ROPA register + DPIA | Docs | AVG 30/35 | 1d | ⚪ |
| **LCN-036** | 🔒 | IP-allowlist admin-endpoints (Cloudflare) | Infra | ISO A.13 | 2u | ⚪ |
| **LCN-037** | 📚 | Security-training programma | Docs | ISO A.7 | 2u | ⚪ |

---

## 🟡 MEDIUM — Fase 6 Refactor Core

| ID | Type | Titel | Component | Principe | Effort | Status |
|---|---|---|---|---|---|---|
| **LCN-038** | 🔧 | `lib/supabase.ts` (1763 LoC) → `lib/repositories/<domain>.ts` | Backend | SRP/DRY | 1d | ⚪ |
| **LCN-039** | 🔧 | Handgeschreven types → gegenereerde `database.ts` | Backend | DRY | 1d | ⚪ |
| **LCN-040** | 🔧 | `sales/page.tsx` (1957 LoC) opsplitsen | Frontend | SRP/KISS | 3d | ⚪ |
| **LCN-041** | 🔧 | Generieke `useCollection<T>` hook | Frontend | DRY | 1d | ⚪ |
| **LCN-042** | 🔧 | `supabaseAdmin()` singleton consolidatie | Backend | DIP | 2u | ⚪ |

---

## 🟡 MEDIUM — Fase 7 Performance + Tests

| ID | Type | Titel | Component | Effort | Status |
|---|---|---|---|---|---|
| **LCN-043** | ⚡ | Server Components migratie (≥ 10 pages) | Frontend | 3d | ⚪ |
| **LCN-044** | ⚡ | Pagination op `/api/leads` (cursor-based) | Backend | 2u | ⚪ |
| **LCN-045** | ⚡ | React Query breder inzetten (≥ 10 pages) | Frontend | 1d | ⚪ |
| **LCN-046** | ✅ | Vitest setup + eerste 3 unit tests | CI/CD | 2u | ⚪ |
| **LCN-047** | ✅ | Playwright smoketests (login + CRUD per domain) | CI/CD | 1d | ⚪ |
| **LCN-048** | 📊 | Structured logger `src/lib/logger.ts` | Backend | 2u | ⚪ |

---

## 🟢 LAAG — Fase 8 Polish

| ID | Type | Titel | Component | Effort | Status | Klaar op |
|---|---|---|---|---|---|---|
| **LCN-049** | 🐛 | `formatCurrency` USD → EUR bugfix | Frontend | 30m | ⚪ | — |
| **LCN-050** | 🔧 | Sub-tickets voor alle 20 files > 500 LoC | — | — | ⚪ | — |
| **LCN-051** | 📚 | `SECURITY-REPORT.md` v2.0 bank-level baseline | Docs | 1d | 🟢 | 2026-04-15 |
| **LCN-052** | 🔒 | ESLint `no-console` regel in `src/app` | CI/CD | 30m | ⚪ | — |

---

## 🔁 Definition of Done

- [ ] Code op `feat/LCN-XXX-*` branch
- [ ] `npx tsc --noEmit` groen
- [ ] `npm run lint` geen nieuwe warnings
- [ ] Acceptance criteria aantoonbaar (curl/screenshot/test)
- [ ] PR-body bevat before/after bij security-tickets
- [ ] Reviewed + gemerged naar `development`
- [ ] `development` gemerged naar `main`
- [ ] Status 🔴 → 🟢 in dit bestand
- [ ] Dashboard progressie bijgewerkt
