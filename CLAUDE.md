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

**Antal AI-forslag:** Sendes som `Math.max(2, tomme dage)` — aldrig færre end 2, aldrig mere end nødvendigt.

**Historik-vindue:** Kun retter lavet inden for de seneste 14 dage havner i "undgå gentagelse"-listen i AI-prompten. Ældre retter er frie at foreslå igen.

**Favoritter:** `is_favorite = 1` i `meals`-tabellen. Sættes automatisk når en ret bedømmes til `favorite_min_stars` eller derover (default 4). Favoritter vises i et kollapsibelt panel under Ugeplaner, hvorfra de kan planlægges direkte.

## Forretningsregler

### Ugeplanlægning
- Ugen starter mandag. Navigér op til 2 uger frem og 2 uger tilbage.
- Dage kan markeres som "Spiser ude", "Ingen madlavning" eller have en planlagt ret.
- Rester: én ret kan strække sig over to dage. Næste dag markeres `is_leftover = 1` og vises som "Rester fra [dag]" uden ingredienser.
- "Lavet"-knappen (✓) markerer status `done` og åbner bedømmelsesdialogen.

### AI-forslag (`/api/plan/suggest`)
- Antal forslag = `Math.max(2, antal tomme dage i ugen)`
- Historik-vindue = retter lavet inden for **14 dage** (undgå gentagelse)
- Favoritter (is_favorite=1) inkluderes som inspiration i prompten
- Ingredienser skaleres til `parseInt(adults) + parseInt(children)` personer
- Hvert forslag indeholder: navn, beskrivelse, tilberedningstid, ingredienser med mængder, opskrift (4–8 trin)
- Forslaget sendes ikke automatisk til en dag — brugeren vælger dag via chips

### 2-dages ret (`/api/plan/scale`)
- Når "Strækker sig over 2 dage" toggles på et AI-forslag, kaldes Mistral for at skalere ingredienserne op
- Primæringredienser (kød, fisk, pasta, ris, kartofler, bønner) fordobles
- Smaggivere (hvidløg, løg, krydderier, olie) øges med ca. 50%
- Væsker (bouillon, fløde, kokosmælk) fordobles
- Dag 1 gemmes med skalerede ingredienser; dag 2 sættes automatisk som `is_leftover = 1`

### Bedømmelse og favoritter
- Bedømmelse 1–5 stjerner gives efter "Lavet" markering
- Tærskel `favorite_min_stars` (default: 4) styres i Indstillinger
- Hvis stjerner ≥ tærskel → `is_favorite = 1` sættes automatisk på retten
- Tag `ikke_igen` → `exclude_from_suggestions = 1`
- Favoritter vises i Ugeplaner og kan planlægges direkte til en dag
- Favoritter kan fjernes manuelt via ✕ (sætter `is_favorite = 0`)

### Lager
- To placeringer: `freezer` (fryser) og `pantry` (spisekammer)
- Kategorier med farvet badge: kød (rød), fisk (blå), grønt (grøn), mejeri (gul), desserter (pink), andet (lilla)
- Varer kan scannes via stregkode (Open Food Facts) eller billedanalyse (Pixtral Vision)

## AI-prompts

### Madforslag (`src/app/api/plan/suggest/route.ts`)

```
Du er en familiekogebog-assistent. Foreslå [N] middagsretter til en dansk familie.

FAMILIEPROFIL:
- [X] voksne og [Y] børn (alder: [aldre]) = [total] personer i alt
- Allergier/præferencer: [allergier]
- Køkkentype: [køkkentype]
- Madpræferencer: [ai_preferences]

LAGER – FRYSER:
- [vare] ([kategori]) – [mængde]
...

LAGER – SPISEKAMMER:
- [vare] ([kategori]) – [mængde]
...

SENESTE RETTER (undgå gentagelse — lavet inden for 14 dage):
- [ret] ([dato])
...

FAVORITTER (forsøg at inkludere 1-2):
- [ret] ([★])
...

Returnér præcis et JSON-array med [N] retter i dette format (ingen markdown, kun JSON):
[
  {
    "name": "Rettens navn",
    "description": "Kort appetitlig beskrivelse (2-3 sætninger)",
    "prep_time": 30,
    "ingredients": ["500g pasta", "400g hakket oksekød", "2 dåser hakkede tomater"],
    "recipe": ["Kog pasta i rigeligt saltet vand i 10 min.", "Brun det hakkede kød på en varm pande.", "..."],
    "uses_inventory": true
  }
]

VIGTIGT:
- Alle ingrediensmængder skal være afpasset til præcis [total] personer
- "ingredients" er en liste af strenge med mængde + navn, fx "500g pasta" eller "3 fed hvidløg"
- "recipe" er en liste af korte trin (4-8 trin) der beskriver fremgangsmåden trin for trin
- Prioritér retter der bruger det der allerede er på lager
- Varier mellem hurtige hverdagsretter og lidt mere festlige retter til weekend
- Alle navne, tekster og trin skal være på dansk
```

### 2-dages skalering (`src/app/api/plan/scale/route.ts`)

```
Du har en opskrift på "[ret]" til [total] personer (1 dag). Juster ingrediensmængderne
så der er nok til 2 dage — altså at man laver dobbelt portion dag 1 og gemmer rester til dag 2.

Ingredienser til [total] personer / 1 dag:
- [ingrediens]
...

Regler:
- Primæringredienser (kød, fisk, pasta, ris, kartofler, bønner) fordobles
- Smaggivere (hvidløg, løg, krydderier, olie) øges med ca. 50%
- Væsker (bouillon, fløde, kokosmælk) fordobles

Returnér KUN et JSON-array med de justerede ingredienser på dansk (ingen markdown, ingen forklaring):
["800g hakket oksekød", "4 dåser hakkede tomater", "600g spaghetti"]
```

### Billedanalyse (`src/app/api/vision/route.ts`)

Pixtral-12B analyserer et billede af en vare og returnerer JSON med navn, kategori, mængde og placering (freezer/pantry).

## Filstruktur — nøglefiler

| Fil | Ansvar |
|-----|--------|
| `src/lib/db.ts` | SQLite schema, migrations, eksporterede typer |
| `src/lib/telegram.ts` | Ugentlig besked-opbygning og Telegram-afsendelse |
| `src/app/api/plan/suggest/route.ts` | Mistral AI-forslag med opskrift og ingredienser |
| `src/app/api/plan/scale/route.ts` | Mistral skalering af ingredienser til 2-dages ret |
| `src/app/api/meals/[id]/rate/route.ts` | Bedømmelse + auto-favorit ved tærskel |
| `src/app/api/vision/route.ts` | Pixtral billedanalyse til lager-scanning |
| `src/components/plan/PlanPage.tsx` | Ugeplanlægning inkl. favoritter og AI-forslag |
| `src/components/settings/SettingsPage.tsx` | Indstillinger inkl. AI-log og favorit-tærskel |
| `server.ts` | Custom Next.js server med node-cron til Telegram |
| `Dockerfile` | Multi-stage build; `.dockerignore` ekskluderer macOS node_modules |

## Docker-setup

- `.dockerignore` ekskluderer `node_modules` og `.next` så container altid bruger Linux-kompilerede native addons
- `deps`-stadiet kører `npm ci` inde i containeren
- `runner`-stadiet kopierer `node_modules` fra `builder` (nødvendigt for `node-cron` og `node-telegram-bot-api` som ikke er bundlet i Next.js standalone)
- Produktion: `docker-compose.yml` → port 8092, volume `family-kitchen-data`
- Dev: `docker-compose.dev.yml` → port 8093, lokal `./data-dev/`
