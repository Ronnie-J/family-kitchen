# FamilyKitchen

Dansk madplanlægnings-webapp til selvhosting. Planlæg ugens mad, hold styr på lager og fryser, få AI-genererede madforslag med opskrifter, og modtag den ugentlige madplan via Telegram.

## Funktioner

- **Ugeplanlægning** — Planlæg alle 7 dage. Naviger frem/tilbage mellem uger. Markér dage som "Spiser ude" eller "Ingen madlavning". Støtte for retter der strækker sig til næste dag (rester).
- **Favoritter** — Retter med høj bedømmelse gemmes automatisk som favoritter og kan planlægges direkte fra Ugeplaner uden at bruge AI.
- **AI-madforslag** — Mistral AI genererer forslag med beskrivelse, ingredienser (skaleret til familiestørrelse) og trin-for-trin opskrift. Forslag tilpasses antal tomme dage og undgår retter lavet inden for de seneste 14 dage.
- **2-dages retter** — Markér et AI-forslag som "Strækker sig over 2 dage". AI skalerer ingredienser op og næste dag sættes automatisk som rester.
- **Lager** — Fryser og spisekammer med farvede kategoribadges. Stregkodescanning via kamera. Billedgenkendelse via Mistral Vision (Pixtral-12B).
- **Indkøbsliste** — Autogenereret fra ugeplanens ingredienser. Faste varer tilføjes automatisk.
- **Madhistorik** — Alle retter du har lavet med dato og stjernebedømmelse.
- **Telegram** — Ugentlig besked sendes automatisk søndag med madplan og indkøbsliste.
- **AI-log** — Se præcis hvilke prompts der sendes til Mistral og hvornår (under Indstillinger).

## Tech stack

| Lag | Teknologi |
|-----|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API routes, Node.js custom server |
| Database | SQLite via better-sqlite3 |
| AI | Mistral AI — `mistral-small-latest` (tekst), `pixtral-12b-2409` (billeder) |
| Billeder | Unsplash API (valgfrit) |
| Stregkode | Open Food Facts API |
| Scheduling | node-cron (Telegram-udsendelse søndag) |
| Container | Docker, port 8092 (produktion) / 8093 (dev) |

## Kom i gang

### Forudsætninger

- Docker og Docker Compose

### Produktion (home server)

```bash
docker compose up -d
```

Åbn **http://[server-ip]:8092**

Data gemmes i Docker-volume `family-kitchen-data`.

### Lokal udvikling

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Åbn **http://localhost:8093**

Data gemmes i `./data-dev/`.

Når du er færdig:
```bash
docker compose -f docker-compose.dev.yml down
```

## Konfiguration

Alle indstillinger sættes i appen under **Indstillinger**:

| Indstilling | Beskrivelse |
|-------------|-------------|
| Familieprofil | Antal voksne, antal børn, alder per barn |
| Allergier/præferencer | Bruges i AI-prompts |
| Madpræferencer til AI | Fritekst om hvad familien kan lide |
| Gem automatisk som favorit ved | Stjernegrænse for auto-favorit (3–5, default 4) |
| Mistral API-nøgle | Gratis på [console.mistral.ai](https://console.mistral.ai) |
| Mistral-model | `mistral-small-latest` anbefales (gratis, EU) |
| Unsplash API-nøgle | Valgfrit — tilføjer madbilleder til forslag |
| Telegram bot-token | Fra @BotFather |
| Telegram chat-ID | Grupperum eller personlig chat |
| Sendetidspunkt | Søndag kl. HH:MM |
| Faste indkøbsvarer | Tilføjes automatisk til indkøbslisten hver uge |

## Forretningsregler

### Ugeplanlægning
- Ugen starter mandag. Man kan navigere op til 2 uger frem og 2 uger tilbage.
- En dag kan enten have en planlagt ret, være markeret "Spiser ude" eller "Ingen madlavning".
- Rester: en ret kan markeres til at strække sig til næste dag. Næste dag vises som "🥘 Rester fra [dag]" uden egne ingredienser.
- "Lavet"-knappen (✓) markerer retten som done og åbner bedømmelsesdialogen.

### AI-forslag
- Antal forslag = `max(2, antal tomme dage i ugen)` — aldrig færre end 2, aldrig mere end nødvendigt.
- Undgår retter der er lavet inden for de **seneste 14 dage**.
- Inkluderer familiens favoritter som inspiration (AI forsøger at inkludere 1–2).
- Ingredienser skaleres præcist til antal personer (voksne + børn).
- Hvert forslag indeholder navn, beskrivelse, tilberedningstid, ingredienser med mængder og fremgangsmåde i 4–8 trin.

### 2-dages retter
- Toggle "Strækker sig over 2 dage?" på et AI-forslag inden du vælger dag.
- Mistral skalerer ingredienserne: primærvarer fordobles, smaggivere +50%, væsker fordobles.
- Dag 1 gemmes med de skalerede ingredienser. Dag 2 sættes automatisk som rester.

### Favoritter
- Bedøm en ret med 4+ stjerner (konfigurerbart) → gemmes automatisk som favorit.
- Favoritter vises i et panel øverst i Ugeplaner og kan planlægges direkte til en dag.
- Fjern en ret fra favoritter via ✕ på favorit-kortet.

### Lager
- To placeringer: fryser og spisekammer.
- Kategorier med farvede badges: kød (rød), fisk (blå), grønt (grøn), mejeri (gul), desserter (pink), andet (lilla).
- Varer kan tilføjes manuelt, via stregkodescanning (Open Food Facts) eller billedanalyse (Pixtral Vision).

## AI-prompts

Prompts er hardkodet i kodebasen og kan tweakes direkte i kildefilerne. Dynamiske værdier indsættes af serveren ved kørselstid.

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

### 2-dages skalering (`src/app/api/plan/scale/route.ts`)

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

### Billedanalyse (`src/app/api/vision/route.ts`)

Pixtral-12B analyserer et foto af en vare og returnerer JSON med navn, kategori, mængde og placering (freezer/pantry).

## Projektstruktur

```
src/
├── app/
│   ├── api/
│   │   ├── ai-logs/       # AI-anmodningslog
│   │   ├── barcode/       # Open Food Facts opslag
│   │   ├── cron/          # Telegram-udsendelse (kaldt af node-cron)
│   │   ├── history/       # Madhistorik
│   │   ├── inventory/     # Lager (fryser + spisekammer)
│   │   ├── meals/         # Opskrifter, bedømmelser og favoritter
│   │   ├── mock/          # Testdata (seed/ryd)
│   │   ├── plan/          # Ugeplan + AI-forslag + 2-dages skalering
│   │   ├── settings/      # Appindstillinger
│   │   ├── shopping/      # Indkøbsliste
│   │   ├── telegram/      # Manuel Telegram-test
│   │   └── vision/        # Billedanalyse (Pixtral)
│   ├── historik/
│   ├── indkob/
│   ├── indstillinger/
│   ├── lager/
│   └── plan/
├── components/
│   ├── history/
│   ├── inventory/
│   ├── layout/            # AppLayout med navigation
│   ├── meals/             # RatingModal
│   ├── plan/              # PlanPage (ugeplanlægning + favoritter)
│   ├── settings/
│   └── shopping/
└── lib/
    ├── db.ts              # SQLite schema og typer
    └── telegram.ts        # Beskedopbygning og afsendelse
```

## Database

SQLite-fil på `/data/family-kitchen.db` (i container).

| Tabel | Indhold |
|-------|---------|
| `inventory_items` | Lager- og frysevarer |
| `meals` | Opskrifter med bedømmelse, favoritstatus og ekskluderingsflag |
| `meal_ratings` | Individuelle bedømmelser med tags |
| `meal_history` | Historik over lavede retter |
| `weekly_plan` | Ugeplaner med opskrift, ingredienser, fremgangsmåde og rester-flag |
| `shopping_items` | Indkøbsliste (uge-tilknyttet + permanente) |
| `settings` | Nøgle/værdi-konfiguration inkl. `favorite_min_stars` |
| `ai_logs` | Log over AI-anmodninger (prompt + svar-uddrag) |
