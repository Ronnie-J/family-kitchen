import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'family-kitchen.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'andet',
      quantity TEXT,
      note TEXT,
      location TEXT NOT NULL DEFAULT 'pantry',
      barcode TEXT,
      image_url TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      removed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      prep_time INTEGER,
      ingredients TEXT DEFAULT '[]',
      image_url TEXT,
      is_favorite INTEGER DEFAULT 0,
      exclude_from_suggestions INTEGER DEFAULT 0,
      avg_rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      last_made_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS meal_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
      tags TEXT DEFAULT '[]',
      rated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS meal_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER REFERENCES meals(id) ON DELETE SET NULL,
      meal_name TEXT NOT NULL,
      made_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      made_by TEXT,
      stars INTEGER,
      tags TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS weekly_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      meal_id INTEGER REFERENCES meals(id) ON DELETE SET NULL,
      meal_name TEXT,
      meal_description TEXT,
      meal_ingredients TEXT DEFAULT '[]',
      meal_prep_time INTEGER,
      meal_image_url TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      UNIQUE(week_start, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT,
      name TEXT NOT NULL,
      quantity TEXT,
      is_checked INTEGER DEFAULT 0,
      is_permanent INTEGER DEFAULT 0,
      added_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS ai_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      type TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response_preview TEXT
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('family_adults', '2'),
      ('family_children', '2'),
      ('family_children_ages', '7, 9'),
      ('allergies', ''),
      ('kitchen_type', 'blandet'),
      ('ai_preferences', 'Vi kan lide varieret mad. Børnene er lidt kræsne. Vi foretrækker retter der kan laves på under en time på hverdage.'),
      ('mistral_api_key', ''),
      ('mistral_model', 'mistral-small-latest'),
      ('unsplash_access_key', ''),
      ('telegram_bot_token', ''),
      ('telegram_chat_id', ''),
      ('telegram_send_time', '09:00'),
      ('permanent_shopping_items', 'Mælk\nÆg\nBrød'),
      ('favorite_min_stars', '4');
  `)

  // Migrations
  try { db.exec(`ALTER TABLE weekly_plan ADD COLUMN is_leftover INTEGER DEFAULT 0`) } catch { /* exists */ }
  try { db.exec(`ALTER TABLE weekly_plan ADD COLUMN meal_recipe TEXT`) } catch { /* exists */ }
  try { db.exec(`ALTER TABLE meals ADD COLUMN recipe TEXT DEFAULT '[]'`) } catch { /* exists */ }
}

export type InventoryItem = {
  id: number
  name: string
  category: string
  quantity: string | null
  note: string | null
  location: 'freezer' | 'pantry'
  barcode: string | null
  image_url: string | null
  added_at: string
  removed_at: string | null
}

export type Meal = {
  id: number
  name: string
  description: string | null
  prep_time: number | null
  ingredients: string
  recipe: string | null
  image_url: string | null
  is_favorite: number
  exclude_from_suggestions: number
  avg_rating: number
  rating_count: number
  last_made_at: string | null
  created_at: string
}

export type WeeklyPlanEntry = {
  id: number
  week_start: string
  day_of_week: number
  meal_id: number | null
  meal_name: string | null
  meal_description: string | null
  meal_ingredients: string
  meal_prep_time: number | null
  meal_image_url: string | null
  meal_recipe: string | null
  status: 'planned' | 'eaten_out' | 'no_cooking' | 'done'
  is_leftover: number
}

export type ShoppingItem = {
  id: number
  week_start: string | null
  name: string
  quantity: string | null
  is_checked: number
  is_permanent: number
  added_at: string
}

export type MealHistory = {
  id: number
  meal_id: number | null
  meal_name: string
  made_at: string
  made_by: string | null
  stars: number | null
  tags: string
}
