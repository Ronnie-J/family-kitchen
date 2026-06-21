import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getWeekStart } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const db = getDb()
  const weekParam = req.nextUrl.searchParams.get('week')
  const week = weekParam || getWeekStart()

  const plan = db.prepare(`
    SELECT * FROM weekly_plan WHERE week_start = ? ORDER BY day_of_week
  `).all(week)

  return NextResponse.json({ week_start: week, plan })
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { week_start, day_of_week, meal_id, meal_name, meal_description, meal_ingredients, meal_prep_time, meal_image_url, status, is_leftover } = body

  const week = week_start || getWeekStart()
  const leftover = is_leftover ? 1 : 0

  if (meal_id) {
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(meal_id) as {
      name: string; description: string; ingredients: string; prep_time: number; image_url: string
    } | undefined

    if (meal) {
      db.prepare(`
        INSERT INTO weekly_plan (week_start, day_of_week, meal_id, meal_name, meal_description, meal_ingredients, meal_prep_time, meal_image_url, status, is_leftover)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(week_start, day_of_week) DO UPDATE SET
          meal_id = excluded.meal_id,
          meal_name = excluded.meal_name,
          meal_description = excluded.meal_description,
          meal_ingredients = excluded.meal_ingredients,
          meal_prep_time = excluded.meal_prep_time,
          meal_image_url = excluded.meal_image_url,
          status = excluded.status,
          is_leftover = excluded.is_leftover
      `).run(week, day_of_week, meal_id, meal.name, meal.description, meal.ingredients, meal.prep_time, meal.image_url, status || 'planned', leftover)
    }
  } else {
    db.prepare(`
      INSERT INTO weekly_plan (week_start, day_of_week, meal_id, meal_name, meal_description, meal_ingredients, meal_prep_time, meal_image_url, status, is_leftover)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(week_start, day_of_week) DO UPDATE SET
        meal_id = NULL,
        meal_name = excluded.meal_name,
        meal_description = excluded.meal_description,
        meal_ingredients = excluded.meal_ingredients,
        meal_prep_time = excluded.meal_prep_time,
        meal_image_url = excluded.meal_image_url,
        status = excluded.status,
        is_leftover = excluded.is_leftover
    `).run(week, day_of_week, meal_name || null, meal_description || null,
      JSON.stringify(meal_ingredients || []), meal_prep_time || null, meal_image_url || null, status || 'planned', leftover)
  }

  return NextResponse.json(db.prepare('SELECT * FROM weekly_plan WHERE week_start = ? AND day_of_week = ?').get(week, day_of_week))
}

export async function DELETE(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { week_start, day_of_week } = body
  db.prepare(`DELETE FROM weekly_plan WHERE week_start = ? AND day_of_week = ?`).run(week_start, day_of_week)
  return NextResponse.json({ ok: true })
}
