# Roadmap — lcntships-workspace

**Bron:** `REPORT.md` + `SECURITY-REPORT.md` + `TICKETS.md`
**Laatst bijgewerkt:** 2026-04-15
**Doorlooptijd:** 12 weken (6 sprints × 2 weken)
**Doel:** score **4.8 → 8.5** met bank-level security posture

---

## 🎯 Totaal

```
[██░░░░░░░░░░░░░░░░░░] 5 / 52 tickets (10%)
```

| Fase | Periode | Tickets | 🟢 | Status |
|---|---|---:|---:|---|
| 1 — Security Lockdown (P0) | Week 1 | LCN-001..005 (5) | 4 | 🟡 |
| 2 — Security Hardening (P1) | Week 2 | LCN-006..009 (4) | 0 | 🔴 |
| 3 — IAM & Crypto | Week 3-4 | LCN-010..016 (7) | 0 | 🔴 |
| 4 — Secure SDLC & AppSec | Week 5-6 | LCN-017..025 (9) | 0 | 🔴 |
| 5 — Ops, GRC & Privacy | Week 7-9 | LCN-026..037 (12) | 0 | 🔴 |
| 6 — Refactor Core | Week 9-10 | LCN-038..042 (5) | 0 | 🔴 |
| 7 — Performance + Tests | Week 11 | LCN-043..048 (6) | 0 | 🔴 |
| 8 — Polish | Week 12 | LCN-049..052 (4) | 1 | 🟡 |

---

## 🗓️ Fase 1 — Security Lockdown (P0)

**Deadline:** Week 1 · **Doel:** stop datalek + account-takeover

| Ticket | Effort | Status |
|---|---|---|
| LCN-001 Middleware auth `/api/*` | 2u | 🟢 |
| LCN-002 `/api/team/invite` dichtzetten | 2u | 🟢 |
| LCN-003 Data-routes achter auth | 2u | 🟢 |
| LCN-004 RLS policies tighten | 1d | 🟢 |
| LCN-005 DOMPurify XSS fix | 30m | ⚪ |

`[████████████████░░░░] 4/5`

---

## 🗓️ Fase 2 — Security Hardening (P1)

| Ticket | Effort | Status |
|---|---|---|
| LCN-006 SSRF guard enrich-lead | 2u | ⚪ |
| LCN-007 Zod-schemas alle routes | 1d | ⚪ |
| LCN-008 Hard-fail missing secrets | 2u | ⚪ |
| LCN-009 Webhook signature verplicht | 30m | ⚪ |

`[░░░░░░░░░░░░░░░░░░░░] 0/4`

---

## 🗓️ Fase 3 — IAM & Cryptografie

| Ticket | Effort | Status |
|---|---|---|
| LCN-010 MFA verplicht | 1d | ⚪ |
| LCN-011 WAF + bot-management | 2u | ⚪ |
| LCN-012 CSP + HSTS + headers | 2u | ⚪ |
| LCN-013 Rate-limiting | 1d | ⚪ |
| LCN-014 Immutable audit_log | 1d | ⚪ |
| LCN-015 Field-level encryption | 1d | ⚪ |
| LCN-016 Session-beleid | 1d | ⚪ |

`[░░░░░░░░░░░░░░░░░░░░] 0/7`

---

## 🗓️ Fase 4 — Secure SDLC & AppSec

| Ticket | Effort | Status |
|---|---|---|
| LCN-017 Gitleaks | 2u | ⚪ |
| LCN-018 SAST | 2u | ⚪ |
| LCN-019 SCA blocking | 2u | ⚪ |
| LCN-020 Signed commits | 2u | ⚪ |
| LCN-021 Branch protection | 30m | ⚪ |
| LCN-022 CSP nonce | 1d | ⚪ |
| LCN-023 Prompt-injection defense | 1d | ⚪ |
| LCN-024 SBOM (Syft) | 2u | ⚪ |
| LCN-025 DAST baseline | 1d | ⚪ |

`[░░░░░░░░░░░░░░░░░░░░] 0/9`

---

## 🗓️ Fase 5 — Ops, GRC & Privacy

| Ticket | Effort | Status |
|---|---|---|
| LCN-026 Backup-verify + DR-drill | 1d | ⚪ |
| LCN-027 SIEM + alerts | 3d | ⚪ |
| LCN-028 Structured logging | 2u | ⚪ |
| LCN-029 4-eyes principe | 1d | ⚪ |
| LCN-030 DMARC/DKIM/SPF | 2u | ⚪ |
| LCN-031 SSO | 1d | ⚪ |
| LCN-032 JIT privileged access | 1d | ⚪ |
| LCN-033 Vendor DPA audit | 2u | ⚪ |
| LCN-034 Data-subject export/delete | 1d | ⚪ |
| LCN-035 AVG ROPA + DPIA | 1d | ⚪ |
| LCN-036 IP-allowlist admin | 2u | ⚪ |
| LCN-037 Security training | 2u | ⚪ |

`[░░░░░░░░░░░░░░░░░░░░] 0/12`

---

## 🗓️ Fase 6 — Refactor Core

| Ticket | Effort | Status |
|---|---|---|
| LCN-038 `lib/supabase.ts` → repos | 1d | ⚪ |
| LCN-039 Dubbele types opruimen | 1d | ⚪ |
| LCN-040 `sales/page.tsx` opsplitsen | 3d | ⚪ |
| LCN-041 `useCollection<T>` hook | 1d | ⚪ |
| LCN-042 Supabase admin singleton | 2u | ⚪ |

`[░░░░░░░░░░░░░░░░░░░░] 0/5`

---

## 🗓️ Fase 7 — Performance + Tests

| Ticket | Effort | Status |
|---|---|---|
| LCN-043 Server Components migratie | 3d | ⚪ |
| LCN-044 Pagination `/api/leads` | 2u | ⚪ |
| LCN-045 React Query breder | 1d | ⚪ |
| LCN-046 Vitest setup | 2u | ⚪ |
| LCN-047 Playwright smoketests | 1d | ⚪ |
| LCN-048 Structured logger | 2u | ⚪ |

`[░░░░░░░░░░░░░░░░░░░░] 0/6`

---

## 🗓️ Fase 8 — Polish

| Ticket | Effort | Status | Klaar op |
|---|---|---|---|
| LCN-049 Currency EUR | 30m | ⚪ | — |
| LCN-050 500+ LoC sub-tickets | — | ⚪ | — |
| LCN-051 `SECURITY-REPORT.md` v2 | 1d | 🟢 | 2026-04-15 |
| LCN-052 ESLint no-console | 30m | ⚪ | — |

`[█████░░░░░░░░░░░░░░░] 1/4`

---

## 📈 Gantt

```
Week:     1   2   3   4   5   6   7   8   9  10  11  12
          ──────────────────────────────────────────────
Fase 1:   ███
Fase 2:       ███
Fase 3:           ███████
Fase 4:                   ███████
Fase 5:                           ███████████
Fase 6:                                       ███████
Fase 7:                                               ███
Fase 8:                                                   ███
```

---

## 🎯 Milestones & Rating Trajectory

| Milestone | Datum | Fase done | Target rating |
|---|---|---|---:|
| **M1** | Week 1 eind | 1 | 5.5 |
| **M2** | Week 2 eind | 2 | 6.0 |
| **M3** | Week 4 eind | 3 | 6.8 |
| **M4** | Week 6 eind | 4 | 7.3 |
| **M5** | Week 9 eind | 5 | 7.9 |
| **M6** | Week 10 eind | 6 | 8.1 |
| **M7** | Week 12 eind | 7 + 8 | **8.5** |

---

## 🎯 KPI eindstaat

| KPI | Nu | Target |
|---|---:|---:|
| OWASP score | 2/10 🔴 | 9/10 🟢 |
| API zonder auth | 26/30 | 0 |
| RLS `qual='true'` | 9 | 0 |
| MFA-adoptie | 0% | 100% |
| Signed commits | 0% | 100% |
| Unit+e2e tests | 1 | ≥ 20 |
| Pages > 500 LoC | 20 | ≤ 3 |
| Server Components | 0/31 | ≥ 10/31 |
| DR-drill vorig kwartaal | nee | ja |
| **Gewogen totaalscore** | **4.8** | **8.5** |

---

## 🔄 Werkwijze

1. Tickets in volgorde LCN-001 → LCN-052
2. Branch: `security/LCN-001-...`, `refactor/LCN-040-...`
3. PR per ticket → review → merge naar `development`
4. Einde sprint: `development` → `main`
5. Update `TICKETS.md` + deze roadmap bij elke merge

*Zie `WORKFLOW.md` voor volledige procedure.*
