# CLAUDE.md — FamilyKitchen

Guidance for Claude Code when working in this project.

> **Language:** All code, commits, documentation, and communication in this console must be in English. The app UI strings remain in Danish.

## Running and testing

**Local dev container (preferred):**
```bash
docker compose -f docker-compose.dev.yml up --build -d
# App available at http://localhost:8093
```

**Stop the container:**
```bash
docker compose -f docker-compose.dev.yml down
```

Never use `npm run dev` for testing — it starts a dev server with HMR WebSockets that crashes Firefox on restart. Use Docker.

Do not run `npx next build` alone as verification — use the Docker build instead, as it catches native addon issues (better-sqlite3 is compiled for Linux inside the container).

## Stack and patterns

- **Next.js 15 App Router** — all pages in `src/app/`, all components in `src/components/`
- **SQLite** via `better-sqlite3` — synchronous, server-side only. Never in Client Components.
- **Tailwind CSS** — stone colour palette as base. Orange (`orange-500`) as primary colour. Rounded cards (`rounded-xl/2xl`). Mobile-first.
- **Mistral AI** — `mistral-small-latest` for text suggestions, `pixtral-12b-2409` for image analysis. Import as `import { Mistral } from '@mistralai/mistralai'` (named export, not default).
- **App language is Danish** — all UI text, AI prompts, and user-facing error messages must remain in Danish.

## Database

`getDb()` from `src/lib/db.ts` — returns a singleton SQLite instance.

New columns are added via migrations with try/catch in `initSchema()`:
```typescript
try { db.exec(`ALTER TABLE foo ADD COLUMN bar TEXT`) } catch { /* already exists */ }
```

Types are exported from `db.ts` — update them when the schema changes.

## Important details

**Week calculation:** Always use local date fields (`d.getFullYear()`, `d.getMonth()+1`, `d.getDate()`) — never `toISOString()` which converts to UTC and gives the wrong date in CEST (+2).

**AI logging:** All Mistral calls must be logged to the `ai_logs` table:
```typescript
db.prepare(`INSERT INTO ai_logs (type, model, prompt) VALUES (?, ?, ?)`).run(type, model, prompt)
// After response:
db.prepare(`UPDATE ai_logs SET response_preview = ? WHERE id = last_insert_rowid()`).run(text.slice(0, 300))
```

**Family size in AI prompts:** `persons = parseInt(adults) + parseInt(children)` — used to scale ingredient quantities.

**Leftovers:** `is_leftover = 1` in `weekly_plan` marks a day as leftovers from the previous day. Shown with a 🥘 badge and amber colour in the UI.

**Suggestions flow:** AI suggestions are not automatically assigned to days — the user selects a day via day chips (Mon–Sun) on each suggestion card.

**AI suggestion count:** Sent as `Math.max(2, empty days)` — never fewer than 2, never more than needed.

**History window:** Only meals made within the last 14 days appear in the "avoid repetition" list in the AI prompt. Older meals can freely be suggested again.

**Favourites:** `is_favorite = 1` in the `meals` table. Set automatically when a meal is rated at or above `favorite_min_stars` (default 4). Favourites appear in a collapsible panel in the week view and can be planned directly to a day.

**Rating model:** Exactly one rating per meal. A new rating DELETEs the existing one and INSERTs the new one. `rating_count` is always 1. No counter is shown in the UI.

**PATCH vs POST for plan updates:** Use PATCH `/api/plan` when only updating `status` — POST is a full upsert and will overwrite meal name and other fields with null if they are not included.

**Permanent shopping items:** The `permanent_shopping_items` setting stores a newline-separated list. These are merged dynamically in the shopping GET route and in `telegram.ts` — they are not stored in `shopping_items`.

## Business rules

### Week planning
- Week starts on Monday. Navigate up to 2 weeks forward and 2 weeks back.
- Days can be marked as "Eating out", "No cooking", or have a planned meal.
- Leftovers: a meal can stretch over two days. The next day is marked `is_leftover = 1` and shown as "Leftovers from [day]" with no ingredients.
- The done button (✓) sets status to `done` and opens the rating dialog.

### AI suggestions (`/api/plan/suggest`)
- Suggestion count = `Math.max(2, empty days in the week)`
- History window = meals made within the **last 14 days** (avoid repetition)
- Favourites (`is_favorite=1`) are included as inspiration in the prompt
- Ingredients scaled to `parseInt(adults) + parseInt(children)` people
- Each suggestion includes: name, description, prep time, ingredients with quantities, recipe (4–8 steps)
- Suggestions are not auto-assigned to days — the user selects via chips

### 2-day meal (`/api/plan/scale`)
- When "Stretches over 2 days" is toggled on an AI suggestion, Mistral is called to scale the ingredients up
- Primary ingredients (meat, fish, pasta, rice, potatoes, beans) are doubled
- Flavourings (garlic, onion, spices, oil) are increased by ~50%
- Liquids (stock, cream, coconut milk) are doubled
- Day 1 is saved with scaled ingredients; day 2 is automatically set as `is_leftover = 1`

### Ratings and favourites
- Rating 1–5 stars given after marking a meal as done
- Threshold `favorite_min_stars` (default: 4) configured in Settings
- If stars ≥ threshold → `is_favorite = 1` is set automatically on the meal
- Tag `ikke_igen` → `exclude_from_suggestions = 1`
- Favourites are shown in the week view and can be planned directly to a day
- Favourites can be removed manually via ✕ (sets `is_favorite = 0`, does not delete the meal)

### Inventory
- Two locations: `freezer` and `pantry`
- Colour-coded category badges: meat (red), fish (blue), produce (green), dairy (yellow), desserts (pink), other (purple)
- Items can be scanned via barcode (Open Food Facts) or image analysis (Pixtral Vision)

## AI prompts

Prompts are hardcoded in the source files and can be tweaked directly. Dynamic values are injected by the server at runtime. Prompt content remains in Danish as Mistral is instructed to return Danish text.

### Meal suggestions (`src/app/api/plan/suggest/route.ts`)

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

### 2-day scaling (`src/app/api/plan/scale/route.ts`)

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

### Image analysis (`src/app/api/vision/route.ts`)

Pixtral-12B analyses an image of an item and returns JSON with name, category, quantity, and location (freezer/pantry).

## Key files

| File | Responsibility |
|------|----------------|
| `src/lib/db.ts` | SQLite schema, migrations, exported types |
| `src/lib/telegram.ts` | Weekly message building and Telegram dispatch |
| `src/app/api/plan/suggest/route.ts` | Mistral AI suggestions with recipe and ingredients |
| `src/app/api/plan/scale/route.ts` | Mistral ingredient scaling for 2-day meals |
| `src/app/api/meals/[id]/rate/route.ts` | Rating + auto-favourite at threshold |
| `src/app/api/vision/route.ts` | Pixtral image analysis for inventory scanning |
| `src/app/api/stats/route.ts` | Statistics API (cooking rate, inventory age, badges) |
| `src/components/plan/PlanPage.tsx` | Week planning including favourites and AI suggestions |
| `src/components/settings/SettingsPage.tsx` | Settings including AI log and favourite threshold |
| `src/components/stats/StatsPage.tsx` | Statistics page with badges and charts |
| `server.ts` | Custom Next.js server with node-cron for Telegram |
| `Dockerfile` | Multi-stage build; `.dockerignore` excludes macOS node_modules |

## Docker setup

- `.dockerignore` excludes `node_modules` and `.next` so the container always uses Linux-compiled native addons
- `deps` stage runs `npm ci` inside the container
- `runner` stage copies `node_modules` from `builder` (required for `node-cron` and `node-telegram-bot-api` which are not bundled in Next.js standalone output)
- `GIT_COMMIT` and `GIT_BUILT_AT` are passed as build args from GitHub Actions and baked in as `NEXT_PUBLIC_*` env vars during `next build`
- Production: `docker-compose.prod.yml` → port 8088, bind mount `/opt/family-kitchen/data:/data`
- Dev: `docker-compose.dev.yml` → port 8093, local `./data-dev/`
- Container runs as root to avoid permission issues with bind-mounted host directories
