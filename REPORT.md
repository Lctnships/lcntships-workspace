# Code Quality Report — lcntships-workspace

**Datum:** 2026-04-15
**Auditor:** Claude Code (Sonnet 4.5)
**Scope:** volledige `src/` tree + `supabase/` migraties
**Framework:** DRY · KISS · SOLID · OWASP Top 10 · Design Patterns · LoC

---

## 🎯 Eindscore: **4.8 / 10** — *werkend maar niet productie-waardig*

| Categorie | Score | Gewicht |
|---|---:|---:|
| Security (OWASP) | 2.0 / 10 🔴 | 30 % |
| Architectuur (SOLID/SRP) | 4.5 / 10 🟠 | 20 % |
| DRY / Code reuse | 5.0 / 10 🟠 | 10 % |
| KISS / Simpelheid | 6.0 / 10 🟡 | 10 % |
| Performance | 5.0 / 10 🟠 | 10 % |
| Tests & tooling | 2.0 / 10 🔴 | 10 % |
| Observability | 3.0 / 10 🔴 | 5 % |
| Documentatie | 7.0 / 10 🟢 | 5 % |

**Gewogen:** `(2.0×0.3) + (4.5×0.2) + (5.0×0.1) + (6.0×0.1) + (5.0×0.1) + (2.0×0.1) + (3.0×0.05) + (7.0×0.05) = 4.80`

---

## 📏 Metrics

| Metric | Waarde |
|---|---:|
| Totaal LoC (`src/**`) | **34 124** |
| Aantal `.ts` + `.tsx` bestanden | ~220 |
| Bestanden > 500 LoC | **20** |
| Bestanden > 1 000 LoC | **10** |
| Grootste file | `sales/page.tsx` (1 957 LoC) |
| API-routes | 30 |
| API-routes zonder auth-check | **26 / 30 (87 %)** |
| Tabellen met `qual='true'` RLS | 9 |
| Client Components in workspace | ~31 / 31 (100 %) |
| Unit tests | 0 |
| E2E tests | 1 (`tests/e2e/workspace-pages.spec.ts`) |

---

## 🔴 Top-10 Prioriteiten

| # | Bevinding | Impact | File:Line | Severity |
|---|---|---|---|---|
| 1 | Middleware skipt `/api/*` — 26/30 routes publiek | Datalek + takeover | `src/middleware.ts:7-9` | 🔴 Kritiek |
| 2 | `/api/leads` geeft 500 records zonder auth | Dump volledige klantdata | `src/app/api/leads/route.ts` | 🔴 Kritiek |
| 3 | `/api/team/invite` retourneert `tempPassword` in response | Account takeover | `src/app/api/team/invite/route.ts` | 🔴 Kritiek |
| 4 | 9 RLS-policies met `qual='true'` → anon-scrape mogelijk | Datalek via anon-key | Supabase `sales_leads`, `customers`, ea. | 🔴 Kritiek |
| 5 | `CampaignReviewSend.tsx` zonder DOMPurify | Stored XSS | `:507` | 🟠 Hoog |
| 6 | `enrich-lead` fetcht user-URL → SSRF | Interne netwerk-scan | `src/app/api/enrich-lead/route.ts` | 🟠 Hoog |
| 7 | `sales/page.tsx` 1957 LoC | Onmaintainbaar | `sales/page.tsx` | 🟠 Hoog |
| 8 | `lib/supabase.ts` 1763 LoC (god-file) | SRP-schending | `src/lib/supabase.ts` | 🟠 Hoog |
| 9 | 0 unit tests | Geen regressie-vangnet | — | 🟠 Hoog |
| 10 | Service-role-key fallback naar anon-key | Silent priv-drop | `lib/supabase.ts` | 🟡 Medium |

---

## 🏗️ Architectuur-bevindingen

### SOLID
- **SRP schending:** 10 bestanden > 1000 LoC combineren data-fetching, state, UI en business logic.
- **DIP schending:** Supabase client direct geïmporteerd in 40+ bestanden — geen repository-laag.
- **OCP redelijk:** shadcn/ui componenten volgen OCP netjes.

### DRY
- `createClient(...)` minstens 12× inline in API routes → moet via singleton.
- Handgeschreven DB-interfaces (`SalesLead`, `Customer`, …) overlappen `Database['public']['Tables']` types.
- Data-fetching pattern `useEffect + loadX()` herhaald in ≥ 20 pages → `useCollection<T>` hook mist.

### KISS
- Meeste componenten zijn leesbaar, maar god-files verdienen opdeling.
- Email-campaign wizard (SelectLeads → WriteEmail → ReviewSend) is een mooi voorbeeld van State-machine.

### Design Patterns aanwezig
- ✅ Provider pattern (`QueryClientProvider`, layout-groepen)
- ✅ Compound components (`shadcn/ui`)
- ❌ Repository pattern (ontbreekt)
- ❌ Service layer (alles in route-files)
- ❌ Command/Query separation

---

## 🧪 Tests & Tooling

- **Unit:** 0 tests, geen Vitest config
- **E2E:** 1 Playwright spec (`workspace-pages.spec.ts`) — smoketest
- **CI:** Geen `.github/workflows/` voor lint/test/build
- **Pre-commit:** Geen hooks, geen gitleaks
- **Linting:** ESLint aanwezig, geen `no-console` regel

---

## 🚀 Performance

- 100% Client Components → grote JS-bundles
- `/api/leads` zonder paginatie, limit 500 → trage UI
- Geen Server Components, geen Suspense boundaries
- React Query slechts in enkele pages

---

## 📚 Documentatie

`CLAUDE.md` is uitstekend: tech stack, env vars, architectuur, service-IDs. Goed.
Geen ADRs, runbooks of incident-response docs.

---

## 📈 Verbeter-traject

Zie `ROADMAP.md` voor 8-fase traject naar score **8.5 / 10**.
Zie `TICKETS.md` voor 52 concrete tickets.
Zie `SECURITY-REPORT.md` voor OWASP-deepdive en bank-level baseline.
