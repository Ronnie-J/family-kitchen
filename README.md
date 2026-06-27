# FamilyKitchen

A Danish family meal planning web app for self-hosting. Plan the week's meals, track freezer and pantry inventory, get AI-generated meal suggestions with recipes, and receive the weekly meal plan via Telegram.

> The app UI is in Danish. All development documentation is in English.

## Features

- **Week planning** — Plan all 7 days. Navigate forward/backward between weeks. Mark days as "Eating out" or "No cooking". Support for meals that stretch into the next day as leftovers.
- **Favourites** — Highly rated meals are automatically saved as favourites and can be planned directly from the week view. Create your own recipes from scratch in the Favourites panel.
- **Inline editing** — Edit ingredients and recipe steps in place — on planned meals, AI suggestions, and favourites.
- **AI meal suggestions** — Mistral AI generates suggestions with description, ingredients (scaled to family size), and step-by-step recipe. Adapts to the number of empty days and avoids meals made within the last 14 days.
- **2-day meals** — Mark an AI suggestion as "Stretches over 2 days". AI scales ingredients up and the next day is automatically set as leftovers.
- **Ratings** — Rate meals 1–5 stars with category badges after cooking. Rating replaces the previous one and is shown on both planned meals and favourites. Editable at any time.
- **Inventory** — Freezer and pantry with colour-coded category badges. Barcode scanning via camera. Image recognition via Mistral Vision (Pixtral-12B).
- **Shopping list** — Auto-generated from the week plan's ingredients. Permanent items from settings are added automatically.
- **Meal history** — All meals you have cooked with date and star rating.
- **Statistics** — Weekly cooking rate, inventory age breakdown, and positive reinforcement badges.
- **Telegram** — Weekly message sent automatically on Sunday with meal plan and shopping list.
- **AI log** — See exactly which prompts are sent to Mistral and when (under Settings).

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API routes, Node.js custom server |
| Database | SQLite via better-sqlite3 |
| AI | Mistral AI — `mistral-small-latest` (text), `pixtral-12b-2409` (images) |
| Images | Unsplash API (optional) |
| Barcode | Open Food Facts API |
| Scheduling | node-cron (Telegram dispatch on Sunday) |
| Container | Docker, port 8088 (production) / 8093 (dev) |

## Getting started

### Prerequisites

- Docker and Docker Compose

### Production (home server via Portainer)

Use `docker-compose.prod.yml` as the stack definition in Portainer. The image is published to `ghcr.io/ronnie-j/family-kitchen:latest` via GitHub Actions on every push to `main`.

Create the data directory on the host before deploying:
```bash
mkdir -p /opt/family-kitchen/data
```

Open **http://[server-ip]:8088**

Data is stored in `/opt/family-kitchen/data` on the host (bind mount).

### Local development

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Open **http://localhost:8093**

Data is stored in `./data-dev/`.

```bash
docker compose -f docker-compose.dev.yml down
```

## Configuration

All settings are managed in the app under **Settings**:

| Setting | Description |
|---------|-------------|
| Family profile | Number of adults, number of children, age per child |
| Allergies/preferences | Used in AI prompts |
| Food preferences for AI | Free text about what the family likes |
| Auto-save as favourite at | Star threshold for auto-favourite (3–5, default 4) |
| Mistral API key | Free at [console.mistral.ai](https://console.mistral.ai) |
| Mistral model | `mistral-small-latest` recommended (free, EU) |
| Unsplash API key | Optional — adds food images to suggestions |
| Telegram bot token | From @BotFather |
| Telegram chat ID | Group chat or personal chat |
| Send time | Sunday at HH:MM |
| Permanent shopping items | Added automatically to the shopping list every week |

## Business rules

### Week planning
- The week starts on Monday. Navigate up to 2 weeks forward and 2 weeks back.
- A day can either have a planned meal, be marked "Eating out", or "No cooking".
- Leftovers: a meal can stretch into the next day. The next day shows as "🥘 Leftovers from [day]" with no separate ingredients.
- The ✓ button marks a meal as done and opens the rating dialog. The meal remains in the week plan with a "Done" badge.

### Ratings
- 1–5 stars and optional category badges: Kid-friendly, Under 30 min, Sunday meal, Vegetarian, Party dish, Never again.
- There is exactly one rating per meal — a new rating replaces the previous one.
- Ratings can be edited at any time via the pencil icon next to the stars.
- Rating and badges are shown on planned meals (expanded panel) and in Favourites.

### AI suggestions
- Number of suggestions = `max(2, empty days in the week)` — never fewer than 2, never more than needed.
- Avoids meals made within the **last 14 days**. Older meals can freely be suggested again.
- Includes family favourites as inspiration (AI attempts to include 1–2).
- Ingredients are scaled precisely to the number of people (adults + children).
- Each suggestion includes name, description, prep time, ingredients with quantities, and a recipe in 4–8 steps.
- Ingredients and recipe steps can be edited directly on the suggestion card before planning.

### 2-day meals
- Toggle "Stretches over 2 days?" on an AI suggestion before selecting a day.
- Mistral scales the ingredients: primary ingredients doubled, flavourings +50%, liquids doubled.
- Day 1 is saved with the scaled ingredients. Day 2 is automatically set as leftovers.

### Favourites
- Rate a meal 4+ stars (configurable in Settings) → saved automatically as a favourite.
- Favourites are shown in a collapsible panel at the top of the week view and can be planned directly to a day.
- Image and recipe from AI suggestions are cached on the meal and carried over when planning from Favourites.
- Create your own recipes from scratch via "**+ Create recipe**" — saved directly as favourites.
- Ingredients and recipe can be edited inline on all favourite cards.
- Remove a meal from favourites via ✕ (does not delete the meal, only removes favourite status).

### Inventory
- Two locations: freezer and pantry.
- Colour-coded category badges: meat (red), fish (blue), produce (green), dairy (yellow), desserts (pink), other (purple).
- Items can be added manually, via barcode scanning (Open Food Facts), or image analysis (Pixtral Vision).

### Statistics
- Weekly cooking rate shown as day-by-day bars for the last 4 weeks.
- Inventory age breakdown: fresh (<7 days), aging (7–30 days), old (>30 days).
- Positive reinforcement badges earned for cooking streaks, using leftovers, high ratings, etc.
- Items older than 30 days are highlighted with a suggestion to plan meals using them.

## AI prompts

Prompts are hardcoded in the codebase and can be tweaked directly in the source files. Dynamic values are inserted by the server at runtime. The app UI strings inside prompts remain in Danish as they are sent to Mistral to generate Danish content.

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

LAGER – SPISEKAMMER:
- [vare] ([kategori]) – [mængde]

SENESTE RETTER (undgå gentagelse — lavet inden for 14 dage):
- [ret] ([dato])

FAVORITTER (forsøg at inkludere 1-2):
- [ret] ([★])

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
- "ingredients" er en liste af strenge med mængde + navn, fx "500g pasta"
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

Regler:
- Primæringredienser (kød, fisk, pasta, ris, kartofler, bønner) fordobles
- Smaggivere (hvidløg, løg, krydderier, olie) øges med ca. 50%
- Væsker (bouillon, fløde, kokosmælk) fordobles

Returnér KUN et JSON-array med de justerede ingredienser på dansk (ingen markdown, ingen forklaring):
["800g hakket oksekød", "4 dåser hakkede tomater", "600g spaghetti"]
```

### Image analysis (`src/app/api/vision/route.ts`)

Pixtral-12B analyses a photo of an item and returns JSON with name, category, quantity, and location (freezer/pantry).

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai-logs/       # AI request log
│   │   ├── barcode/       # Open Food Facts lookup
│   │   ├── cron/          # Telegram dispatch (called by node-cron)
│   │   ├── history/       # Meal history
│   │   ├── inventory/     # Inventory (freezer + pantry)
│   │   ├── meals/         # Recipes, ratings, and favourites
│   │   ├── mock/          # Test data (seed/clear)
│   │   ├── plan/          # Week plan + AI suggestions + 2-day scaling
│   │   ├── settings/      # App settings
│   │   ├── shopping/      # Shopping list
│   │   ├── stats/         # Statistics API
│   │   ├── telegram/      # Manual Telegram test
│   │   └── vision/        # Image analysis (Pixtral)
│   ├── historik/
│   ├── indkob/
│   ├── indstillinger/
│   ├── lager/
│   ├── plan/
│   └── statistik/
├── components/
│   ├── history/
│   ├── inventory/
│   ├── layout/            # AppLayout with navigation and version display
│   ├── meals/             # RatingModal
│   ├── plan/              # PlanPage, InlineListEditor, AddMealForm, MealRatingBadges
│   ├── settings/
│   ├── shopping/
│   └── stats/             # StatsPage
└── lib/
    ├── db.ts              # SQLite schema and types
    └── telegram.ts        # Message building and Telegram dispatch
```

## Database

SQLite file at `/data/family-kitchen.db` (inside container), bind-mounted from `/opt/family-kitchen/data` on the host.

| Table | Contents |
|-------|----------|
| `inventory_items` | Freezer and pantry items |
| `meals` | Recipes with image, recipe steps, rating, favourite status, and exclusion flag |
| `meal_ratings` | Rating with tags — exactly one per meal (replaced on change) |
| `meal_history` | History of cooked meals |
| `weekly_plan` | Week plans with recipe, ingredients, recipe steps, and leftover flag |
| `shopping_items` | Shopping list (week-linked + permanent) |
| `settings` | Key/value configuration including `favorite_min_stars` |
| `ai_logs` | Log of AI requests (prompt + response preview) |

## Deployment

Images are published to `ghcr.io/ronnie-j/family-kitchen:latest` via GitHub Actions on every push to `main`. The git commit SHA is baked in as `NEXT_PUBLIC_GIT_COMMIT` and displayed in the bottom of the desktop sidebar.

To update on the home server: pull and redeploy the stack in Portainer.
