import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  const body = await req.json()
  const { stars, tags = [], made_by, mark_as_made = true } = body

  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(id) as {
    id: number; name: string; avg_rating: number; rating_count: number
  } | undefined
  if (!meal) return NextResponse.json({ error: 'Ret ikke fundet' }, { status: 404 })

  const minStars = parseInt(
    (db.prepare('SELECT value FROM settings WHERE key = ?').get('favorite_min_stars') as { value: string } | undefined)?.value ?? '4'
  )

  if (stars && stars >= 1 && stars <= 5) {
    db.prepare(`INSERT INTO meal_ratings (meal_id, stars, tags) VALUES (?, ?, ?)`).run(id, stars, JSON.stringify(tags))

    const newCount = meal.rating_count + 1
    const newAvg = (meal.avg_rating * meal.rating_count + stars) / newCount

    const isFavorite = stars >= minStars ? 1 : undefined
    const exclude = tags.includes('ikke_igen') ? 1 : undefined

    db.prepare(`
      UPDATE meals SET
        avg_rating = ?, rating_count = ?,
        is_favorite = COALESCE(?, is_favorite),
        exclude_from_suggestions = COALESCE(?, exclude_from_suggestions),
        last_made_at = CASE WHEN ? = 1 THEN datetime('now', 'localtime') ELSE last_made_at END
      WHERE id = ?
    `).run(newAvg, newCount, isFavorite ?? null, exclude ?? null, mark_as_made ? 1 : 0, id)
  }

  if (mark_as_made) {
    db.prepare(`
      INSERT INTO meal_history (meal_id, meal_name, made_by, stars, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, meal.name, made_by || null, stars || null, JSON.stringify(tags))

    if (!stars) {
      db.prepare(`UPDATE meals SET last_made_at = datetime('now', 'localtime') WHERE id = ?`).run(id)
    }
  }

  return NextResponse.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(id))
}
