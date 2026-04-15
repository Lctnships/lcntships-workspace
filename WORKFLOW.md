# Werkwijze — Claude Code + lcntships

**Versie:** 2026-04-15
**Doel:** Reproduceerbare workflow voor systematische app-verbeteringen met Claude Code.
**Project-prefix:** `LCN-XXX` (sequentieel)

---

## 1. Git Flow (verplicht)

```
feat/LCN-XXX-korte-beschrijving ─► development ─► main (productie)
                    ↑                   ↑            ↑
              1 ticket per         staging         auto-deploy
               feature branch      integration    via Vercel
```

**Regels:**
- **1 ticket = 1 feature branch**
- Branch naam: `feat/LCN-XXX-...`, `fix/LCN-XXX-...`, `refactor/LCN-XXX-...`, `security/LCN-XXX-...`
- `development` = staging, `main` = productie
- Merge via `--no-ff`

**Per ticket cyclus:**
```bash
git checkout development && git pull --rebase
git checkout -b feat/LCN-XXX-omschrijving
# ... werk + tests + commit(s)
git push -u origin feat/LCN-XXX-omschrijving
git checkout development && git merge feat/LCN-XXX-... --no-ff -m "Merge feat/LCN-XXX: ..."
git push
git checkout main && git pull --rebase
git merge development --no-ff -m "Merge dev → main: LCN-XXX"
git push
```

---

## 2. Documentatie bestanden (root)

- **REPORT.md** — code quality audit + scores
- **TICKETS.md** — tabel met alle tickets, status, prioriteit
- **ROADMAP.md** — fases + Gantt + milestones
- **SECURITY-REPORT.md** — OWASP Top 10 + AVG + rating
- **CLAUDE.md** — tech stack + env vars + deployment
- **WORKFLOW.md** — dit bestand

---

## 3. Ticket Structuur

| Veld | Waarde |
|---|---|
| **ID** | `LCN-XXX` sequentieel |
| **Type** | 🐛 Bug · 🔒 Security · ⚡ Perf · 🔧 Refactor · ✅ Test · 📚 Docs · 🎚️ Feature |
| **Component** | Frontend · Backend · DB · Infra · CI/CD |
| **Effort** | 1u · 2u · 1d · 3d · 1w |
| **Status** | 🟢 Done · 🟡 Partial · ⚪ Todo · 🔵 Blocked · ⚫ Cancelled |
| **Prioriteit** | 🔴 Kritiek · 🟠 Hoog · 🟡 Medium · 🟢 Laag |

---

## 4. Commit Message Conventie

```
<type>(<ticket>): <subject in imperative>

<body — wat + waarom>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `security`, `test`, `docs`, `chore`

---

## 5. Quality Gates (altijd voor merge)

```bash
npm run lint
npx tsc --noEmit
npm test         # na TEST-01 setup
npm run build
```

---

## 6. Security Reviews

OWASP Top 10 volgorde: A01 → A10. Tools: gitleaks (pre-commit), Semgrep SAST, npm audit, Dependabot, Supabase RLS.

---

## 7. Refactor Strategie

- Drempel: > 500 LOC = red flag
- Extract: data fetching → hook, UI sections → subcomponenten, helpers → utils
- Eén chunk per branch, tests eerst

---

## 8. Do's & Don'ts

**Do's:**
- Tests schrijven tijdens refactor
- `npx tsc --noEmit` voor elke commit
- Idempotente DB migraties (`DROP POLICY IF EXISTS`)

**Don'ts:**
- Meerdere tickets in één commit
- Skip quality gates
- Commit `.env` files
- Push naar `main` zonder dev-stap
- `git reset --hard` zonder backup

---

*Oorspronkelijk uit Konsensi-sessie (april 2026). Geadopteerd voor lcntships 2026-04-15.*
