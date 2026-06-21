# CLAUDE.md — FamilyKitchen

Vejledning til Claude Code om dette projekt.

## Kør og test

**Lokal dev-container (foretrukket):**
```bash
docker compose -f docker-compose.dev.yml up --build -d
# App tilgængelig på http://localhost:8093
```

**Stop containeren:**
```bash
docker compose -f docker-compose.dev.yml down
```

Brug ALDRIG `npm run dev` til test — det starter en dev-server med HMR WebSockets der crasher Firefox når den genstarter. Brug Docker.

Kør IKKE `npx next build` alene som verifikation — brug docker-buildet i stedet, da det fanger native addon-problemer (better-sqlite3 kompileres til Linux i container).

## Stack og mønstre

- **Next.js 15 App Router** — alle sider er i `src/app/`, alle komponenter i `src/components/`
- **SQLite** via `better-sqlite3` — synkron, kun server-side. Aldrig i Client Components.
- **Tailwind CSS** — stone-farvepalette som base. Orange (orange-500) som primærfarve. Afrundede kort (rounded-xl/2xl). Mobile-first.
- **Mistral AI** — `mistral-small-latest` til tekstforslag, `pixtral-12b-2409` til billedanalyse. Importér som `import { Mistral } from '@mistralai/mistralai'` (ikke default export).
- **Sproget er dansk** — al UI-tekst, AI-prompts og fejlbeskeder skal være på dansk.

## Database

`getDb()` fra `src/lib/db.ts` — returnerer singleton SQLite-instans.

Nye kolonner tilføjes via migration med try/catch i `initSchema()`:
```typescript
try { db.exec(`ALTER TABLE foo ADD COLUMN bar TEXT`) } catch { /* exists */ }
```

Typer eksporteres fra `db.ts` — opdatér dem når skemaet ændres.

## Vigtige detaljer

**Ugeberegning:** Brug altid lokale dato-felter (`d.getFullYear()`, `d.getMonth()+1`, `d.getDate()`) — ALDRIG `toISOString()` som konverterer til UTC og giver forkert dato i CEST (+2).

**AI-logging:** Alle kald til Mistral skal logges i `ai_logs`-tabellen via:
```typescript
db.prepare(`INSERT INTO ai_logs (type, model, prompt) VALUES (?, ?, ?)`).run(type, model, prompt)
// Efter svar:
db.prepare(`UPDATE ai_logs SET response_preview = ? WHERE id = last_insert_rowid()`).run(text.slice(0, 300))
```

**Familiestørrelse i AI-prompts:** `persons = parseInt(adults) + parseInt(children)` — bruges til at skalere ingrediensmængder.

**Rester:** `is_leftover = 1` i `weekly_plan` markerer en dag som rester fra dagen før. Vises med 🥘-badge og amber-farve i UI.

**Suggestions-flow:** AI-forslag gemmes ikke automatisk til dage — brugeren vælger selv dag via dag-chips (Man–Søn) på hvert forslagskort.

## Filstruktur — nøglefiler

| Fil | Ansvar |
|-----|--------|
| `src/lib/db.ts` | SQLite schema, migrations, eksporterede typer |
| `src/lib/telegram.ts` | Ugentlig besked-opbygning og Telegram-afsendelse |
| `src/app/api/plan/suggest/route.ts` | Mistral AI-forslag med opskrift og ingredienser |
| `src/app/api/vision/route.ts` | Pixtral billedanalyse til lager-scanning |
| `src/components/plan/PlanPage.tsx` | Ugeplanlægning — den mest komplekse komponent |
| `src/components/settings/SettingsPage.tsx` | Indstillinger inkl. AI-log |
| `server.ts` | Custom Next.js server med node-cron til Telegram |
| `Dockerfile` | Multi-stage build; `.dockerignore` ekskluderer macOS node_modules |

## Docker-setup

- `.dockerignore` ekskluderer `node_modules` og `.next` så container altid bruger Linux-kompilerede native addons
- `deps`-stadiet kører `npm ci` inde i containeren
- `runner`-stadiet kopierer `node_modules` fra `builder` (nødvendigt for `node-cron` og `node-telegram-bot-api` som ikke er bundlet i Next.js standalone)
- Produktion: `docker-compose.yml` → port 8092, volume `family-kitchen-data`
- Dev: `docker-compose.dev.yml` → port 8093, lokal `./data-dev/`
