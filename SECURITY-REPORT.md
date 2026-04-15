# Security Report — lcntships-workspace

**Versie:** 2.0 (bank-level baseline)
**Datum:** 2026-04-15
**Scope:** Frontend (Next.js) + Backend (API routes + Supabase) + Infra (Vercel/Cloudflare/Supabase)
**Frameworks:** OWASP Top 10 (2021) · OWASP ASVS L2 · ISO 27001 Annex A · SOC 2 Type II · NIST CSF · AVG/GDPR

---

## 🎯 Security Rating: **2.0 / 10 🔴**

Target na roadmap Fase 1-5: **9.0 / 10**.

---

## 0. Control-overzicht matrix

| # | Control | Status | Ticket |
|---|---|---|---|
| C01 | API-middleware auth | 🔴 afwezig | LCN-001 |
| C02 | Role-based access (RBAC) | 🔴 afwezig | LCN-010, LCN-032 |
| C03 | Multi-factor auth (MFA) | 🔴 afwezig | LCN-010 |
| C04 | RLS tight (`authenticated` i.p.v. `true`) | 🔴 9 tabellen fout | LCN-004 |
| C05 | Input-validation (Zod) | 🔴 afwezig | LCN-007 |
| C06 | Output-sanitisatie (DOMPurify) | 🟡 partieel | LCN-005 |
| C07 | SSRF guard | 🔴 afwezig | LCN-006 |
| C08 | Rate-limiting | 🔴 afwezig | LCN-013 |
| C09 | Webhook signature | 🟡 optioneel | LCN-009 |
| C10 | Strict CSP + HSTS | 🔴 afwezig | LCN-012 |
| C11 | WAF + bot-management | 🔴 afwezig | LCN-011 |
| C12 | Field-level encryption | 🔴 afwezig | LCN-015 |
| C13 | Immutable audit log | 🔴 afwezig | LCN-014 |
| C14 | Secrets scanning (gitleaks) | 🔴 afwezig | LCN-017 |
| C15 | SAST (Semgrep) | 🔴 afwezig | LCN-018 |
| C16 | SCA (Snyk/Dependabot) | 🔴 afwezig | LCN-019 |
| C17 | Signed commits | 🔴 afwezig | LCN-020 |
| C18 | Branch protection + CODEOWNERS | 🔴 afwezig | LCN-021 |
| C19 | DR-drill + backup-verify | 🔴 afwezig | LCN-026 |
| C20 | SIEM/anomaly-detection | 🔴 afwezig | LCN-027 |
| C21 | DMARC/DKIM/SPF strikt | 🔴 partieel | LCN-030 |
| C22 | SSO/IdP | 🔴 afwezig | LCN-031 |
| C23 | JIT privileged access | 🔴 afwezig | LCN-032 |
| C24 | AVG ROPA + DPIA | 🔴 afwezig | LCN-035 |
| C25 | Data-subject export/delete | 🔴 afwezig | LCN-034 |

---

## 1. Scope & Posture Target

**Data-classificatie (Tiering):**
- **T0** — Secrets (service-role key, API keys) → never client, encrypt at rest
- **T1** — Authentication creds (password hashes, refresh tokens) → Supabase managed
- **T2** — PII (lead contacts, emails, phones) → RLS + audit
- **T3** — Internal business data (bookings, invoices) → RLS
- **T4** — Metadata/config → authenticated only
- **T5** — Public (marketing content) → no restriction

**Posture target:** Bank-level analog — OWASP ASVS L2, ISO 27001 controls aanwezig of equivalent aantoonbaar.

---

## 2. OWASP Top 10 (2021) — Status

| Categorie | Status | Bevindingen | Tickets |
|---|---|---|---|
| **A01 Broken Access Control** | 🔴 | Middleware skipt `/api/*`, 26/30 routes publiek; 9 RLS `qual='true'` | LCN-001..004 |
| **A02 Crypto Failures** | 🟠 | IMAP-passwords plaintext in DB; geen field-encryption | LCN-015 |
| **A03 Injection / XSS** | 🟠 | 1× `dangerouslySetInnerHTML` zonder DOMPurify | LCN-005 |
| **A04 Insecure Design** | 🔴 | Geen Zod-validatie op 30 routes; geen rate-limit | LCN-007, LCN-013 |
| **A05 Security Misconfig** | 🔴 | Geen strict CSP, geen HSTS preload, service-role fallback naar anon | LCN-008, LCN-012 |
| **A06 Vulnerable Components** | 🟡 | Geen Dependabot, geen Snyk | LCN-019 |
| **A07 Auth Failures** | 🔴 | Geen MFA; `/api/team/invite` retourneert `tempPassword` | LCN-002, LCN-010 |
| **A08 Data Integrity** | 🟠 | Webhook signature optioneel; geen SBOM | LCN-009, LCN-024 |
| **A09 Logging Failures** | 🔴 | Geen audit log, geen correlation-ids | LCN-014, LCN-048 |
| **A10 SSRF** | 🔴 | `enrich-lead` fetcht arbitrary URL zonder filter | LCN-006 |

---

## 3. Threat Model (STRIDE — 16 scenario's)

| ID | Actor | Scenario | STRIDE | Mitigation |
|---|---|---|---|---|
| T1 | Externe scraper | `curl /api/leads` → dump | I | LCN-001 |
| T2 | Externe | Anon-key via browser → REST API scrape | I | LCN-004 |
| T3 | Externe | `/api/team/invite` misbruik voor temp-password | E | LCN-002 |
| T4 | Ingelogde user | Privilege escalation via RLS-gat | E | LCN-010, LCN-032 |
| T5 | Externe | XSS in campaign HTML → cookie steal | T | LCN-005 |
| T6 | Externe | SSRF via enrich-lead → scan `169.254.169.254` | I | LCN-006 |
| T7 | Externe | Credential stuffing login | S | LCN-013, LCN-010 |
| T8 | Externe | Email spoofing `@lcntships.com` | S | LCN-030 |
| T9 | Compromised laptop | Session-hijack via gestolen cookie | S | LCN-016 (sessie-pol) |
| T10 | Insider | Destructive DELETE zonder 4-eyes | R | LCN-029 |
| T11 | Supply-chain | Malicious npm-package | T | LCN-017..019 |
| T12 | Externe | DDoS via `/api/search-leads` | D | LCN-011, LCN-013 |
| T13 | Externe | Data-exfil via gestolen service-role key | I | LCN-015, LCN-017 |
| T14 | LLM prompt-injection | Claude-enrichment verzint query | T | LCN-023 |
| T15 | Externe | Replay webhook | T | LCN-009 |
| T16 | Externe | Email-header injection via onvalidated input | T | LCN-007 |

---

## 4. RLS-matrix

| Tabel | Huidige `qual` | Target | Ticket |
|---|---|---|---|
| `sales_leads` | `true` 🔴 | `auth.role() = 'authenticated'` | LCN-004 |
| `customers` | `true` 🔴 | `authenticated` + owner-check | LCN-004 |
| `users` | `true` 🔴 | `authenticated` | LCN-004 |
| `profiles` | `true` 🔴 | `auth.uid() = id` | LCN-004 |
| `team_members` | `true` 🔴 | admin-only | LCN-004 |
| `sent_emails` | `true` 🔴 | `authenticated` | LCN-004 |
| `lead_contacts` | `true` 🔴 | `authenticated` | LCN-004 |
| `lead_activities` | `true` 🔴 | `authenticated` | LCN-004 |
| `sales_agenda` | `true` 🔴 | `authenticated` | LCN-004 |

---

## 5. Controls Framework Mapping

| NIST CSF | ISO 27001 Annex A | SOC 2 | Ticket |
|---|---|---|---|
| ID.AM | A.5.9 Asset inventory | CC3.2 | REPORT.md §Metrics |
| PR.AC | A.5.15 Access control | CC6.1 | LCN-001, LCN-010 |
| PR.DS | A.8.24 Crypto use | CC6.7 | LCN-015 |
| PR.IP | A.8.25 Secure dev | CC7.1 | LCN-017..024 |
| DE.CM | A.8.16 Monitoring | CC7.2 | LCN-027 |
| RS.RP | A.5.24 Incident resp | CC7.4 | §8 below |
| RC.RP | A.5.30 ICT continuity | A1.2 | LCN-026 |

---

## 6. Identity & Access Management

**Huidige staat:**
- Supabase Auth (email+password)
- Geen MFA
- Geen RBAC-laag in app (iedereen = `team_member`)
- Sessie 7 dagen sliding

**Target (bank-level):**
- MFA verplicht (TOTP/WebAuthn) voor alle `team_members` → LCN-010
- RBAC met rollen: `viewer` · `editor` · `admin` · `owner`
- JIT privileged access (max 2u admin) → LCN-032
- Session tightening (device-fingerprint, IP-change detection) → LCN-016
- 4-eyes voor destructieve acties → LCN-029

---

## 7. Cryptography

| Laag | Nu | Target | Ticket |
|---|---|---|---|
| TLS in transit | ✅ TLS 1.3 via Vercel/Supabase | ✅ behouden | — |
| At rest | ✅ Supabase disk-encryption | ✅ behouden | — |
| Field-level (secrets in DB) | 🔴 plaintext IMAP pwds | pgsodium envelope-encrypt | LCN-015 |
| Key management | 🔴 secrets in Vercel UI | Supabase Vault + rotatie-plan | LCN-015 |
| HSTS | 🔴 afwezig | preload | LCN-012 |

---

## 8. Secure SDLC

| Stap | Status | Target | Ticket |
|---|---|---|---|
| Signed commits (GPG/SSH) | 🔴 | verplicht op `main` | LCN-020 |
| Branch protection | 🟡 | review + CODEOWNERS | LCN-021 |
| Pre-commit gitleaks | 🔴 | ✅ | LCN-017 |
| SAST in CI | 🔴 | Semgrep/CodeQL | LCN-018 |
| SCA blocking high/crit | 🔴 | Snyk + Dependabot | LCN-019 |
| DAST baseline | 🔴 | OWASP ZAP weekly | LCN-025 |
| SBOM | 🔴 | Syft in release-pipeline | LCN-024 |
| Prompt-injection defense | 🔴 | input-sanitize + output-validate | LCN-023 |

---

## 9. Infrastructure Security Headers (target)

| Header | Waarde |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | strict, nonce-based, geen `unsafe-inline` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Ticket: **LCN-012**

---

## 10. Logging, Monitoring & Incident Response

**Nu:** `console.log` verspreid, geen structuur, geen retention.

**Target:**
- `audit_log` tabel — INSERT-only, RLS-blocked voor UPDATE/DELETE → LCN-014
- Correlation-id per request → LCN-048
- SIEM (Logtail/Datadog) met alerts op: failed-login burst, role-grant, bulk-export → LCN-027
- **SEV-matrix:**
  - SEV1 (datalek actief): PagerDuty + tel CEO, RTO 1u
  - SEV2 (service down): Slack + on-call, RTO 4u
  - SEV3 (degraded): email, next business day

---

## 11. BCDR (Business Continuity & Disaster Recovery)

| Metric | Target | Ticket |
|---|---|---|
| RTO | < 4u | LCN-026 |
| RPO | < 1u | LCN-026 |
| DR-drill cadence | elk kwartaal | LCN-026 |
| Backup-verify | elke week restore-test | LCN-026 |

---

## 12. Vendor / Third-party Risk

| Vendor | Data | DPA status | Ticket |
|---|---|---|---|
| Supabase | T0-T4 | ✅ verified | LCN-033 |
| Resend | T2 (emails) | 🟡 verify | LCN-033 |
| Apollo.io | T2 (lead enrich) | 🔴 check | LCN-033 |
| Anthropic | T3 (CSV content) | 🟡 verify | LCN-033 |
| SerpAPI | T5 (public) | 🔴 check | LCN-033 |
| Vercel | T0 (env vars) | ✅ DPA available | LCN-033 |
| Cloudflare | T5 | ✅ DPA available | LCN-033 |

---

## 13. Privacy / AVG

| AVG artikel | Control | Ticket |
|---|---|---|
| Art. 5 (beginselen) | doelbinding in ROPA | LCN-035 |
| Art. 15 (inzage) | export-endpoint | LCN-034 |
| Art. 17 (vergetelheid) | delete-cascade | LCN-034 |
| Art. 20 (dataportabiliteit) | JSON-export | LCN-034 |
| Art. 28 (sub-processors) | DPA's archief | LCN-033 |
| Art. 30 (ROPA) | register per dataset | LCN-035 |
| Art. 32 (security) | deze baseline | alles |
| Art. 35 (DPIA) | bij high-risk processing | LCN-035 |

---

## 14. ISO 27001 Annex A — Gap-matrix (selectie)

| Control | Status | Ticket |
|---|---|---|
| A.5.15 Access control | 🔴 | LCN-001, LCN-010 |
| A.5.17 Authentication info | 🔴 | LCN-010 |
| A.5.23 Cloud services | 🟡 | LCN-033 |
| A.5.24 Incident management | 🔴 | §10 |
| A.5.30 ICT continuity | 🔴 | LCN-026 |
| A.8.8 Vuln management | 🔴 | LCN-043 |
| A.8.16 Monitoring | 🔴 | LCN-027 |
| A.8.24 Crypto use | 🟠 | LCN-015 |
| A.8.25 Secure dev | 🔴 | LCN-017..024 |
| A.8.28 Secure coding | 🟡 | LCN-007 |

---

## 15. KPI-dashboard (metingen)

| KPI | Nu | Target | Meting |
|---|---:|---:|---|
| OWASP-score | 2/10 | 9/10 | audit |
| API-routes zonder auth | 26/30 | 0 | grep requireAuth |
| RLS `qual='true'` tables | 9 | 0 | Supabase query |
| MFA-adoptie team | 0% | 100% | auth metadata |
| Signed commits op `main` | 0% | 100% | GitHub API |
| Secrets in git-history | onbekend | 0 | gitleaks scan |
| High/Crit CVE > 72u open | onbekend | 0 | Snyk |
| DR-drill vorig kwartaal | nee | ja | runbook-log |
| Failed login alert-rule | nee | ja | SIEM |

---

## 16. Verificatie-queries

```bash
# Auth check per route
for f in $(find src/app/api -name "route.ts"); do
  grep -L "requireAuth\|getUser" "$f" && echo "UNPROTECTED: $f"
done

# RLS qual='true' check
# Via Supabase MCP: SELECT tablename, policyname, qual FROM pg_policies WHERE qual = 'true';

# Secrets scan
gitleaks detect --source . --verbose

# CVE scan
npm audit --audit-level=high
```

---

## 17. Changelog

- **v2.0** (2026-04-15) — Bank-level baseline; STRIDE; ISO/SOC2/NIST/ASVS L2 mapping; 52 tickets gelinkt via LCN-XXX.
- **v1.0** (2026-04-15) — Eerste security baseline.
