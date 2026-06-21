# FamilyKitchen

Dansk madplanslægnings-webapp til selvhosting. Planlæg ugens mad, hold styr på lager og fryser, få AI-genererede madforslag med opskrifter, og modtag den ugentlige madplan via Telegram.

## Funktioner

- **Ugeplanlægning** — Planlæg alle 7 dage. Naviger frem/tilbage mellem uger. Markér dage som "Spiser ude" eller "Ingen madlavning". Støtte for rester der strækker sig til næste dag.
- **AI-madforslag** — Mistral AI genererer forslag med beskrivelse, ingredienser (skaleret til familiestørrelse) og trin-for-trin opskrift. Forslag vises med dag-vælger så du selv bestemmer hvilken dag.
- **Lager** — Fryser og spisekammer. Stregkodescanning via kamera. Billedgenkendelse via Mistral Vision (Pixtral-12B).
- **Indkøbsliste** — Autogenereret fra ugeplanens ingredienser. Faste varer tilføjes automatisk.
- **Madhistorik** — Alle retter du har lavet med dato og stjernebedømmelse.
- **Telegram** — Ugentlig besked sendes automatisk søndag med madplan og indkøbsliste.
- **AI-log** — Se præcis hvilke prompts der sendes til Mistral og hvornår.

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
| Mistral API-nøgle | Gratis på [console.mistral.ai](https://console.mistral.ai) |
| Mistral-model | `mistral-small-latest` anbefales (gratis, EU) |
| Unsplash API-nøgle | Valgfrit — tilføjer madbilleder til forslag |
| Telegram bot-token | Fra @BotFather |
| Telegram chat-ID | Grupperum eller personlig chat |
| Sendetidspunkt | Søndag kl. HH:MM |
| Faste indkøbsvarer | Tilføjes automatisk til indkøbslisten hver uge |

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
│   │   ├── meals/         # Opskrifter og bedømmelser
│   │   ├── plan/          # Ugeplan + AI-forslag
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
│   ├── plan/              # PlanPage (hoveddel af appen)
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
| `meals` | Opskrifter med bedømmelse og favoritstatus |
| `meal_ratings` | Individuelle bedømmelser |
| `meal_history` | Historik over lavede retter |
| `weekly_plan` | Ugeplaner med opskrift, ingredienser og fremgangsmåde |
| `shopping_items` | Indkøbsliste (uge-tilknyttet + permanente) |
| `settings` | Nøgle/værdi-konfiguration |
| `ai_logs` | Log over AI-anmodninger (prompt + svar-uddrag) |
