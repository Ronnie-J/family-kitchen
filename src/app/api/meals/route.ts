import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
  const favOnly = req.nextUrl.searchParams.get('favorites')
  const where = favOnly ? 'WHERE m.exclude_from_suggestions = 0 AND m.is_favorite = 1' : ''
  const query = `
    SELECT m.*,
      (
        SELECT GROUP_CONCAT(DISTINCT tag.value)
        FROM meal_ratings mr, json_each(mr.tags) AS tag
        WHERE mr.meal_id = m.id AND tag.value != ''
      ) AS tags
    FROM meals m
    ${where}
    ORDER BY m.avg_rating DESC, m.name
  `
  return NextResponse.json(db.prepare(query).all())
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { name, description, prep_time, ingredients = [], recipe = [], image_url, is_favorite } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Navn er påkrævet' }, { status: 400 })

  const result = db.prepare(`
    INSERT INTO meals (name, description, prep_time, ingredients, recipe, image_url, is_favorite)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name.trim(), description || null, prep_time || null, JSON.stringify(ingredients), JSON.stringify(recipe), image_url || null, is_favorite ? 1 : 0)

  return NextResponse.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid), { status: 201 })
}
