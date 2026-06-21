import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
  const favorites = req.nextUrl.searchParams.get('favorites')
  const query = favorites
    ? 'SELECT * FROM meals WHERE exclude_from_suggestions = 0 AND is_favorite = 1 ORDER BY avg_rating DESC, name'
    : 'SELECT * FROM meals ORDER BY avg_rating DESC, name'
  return NextResponse.json(db.prepare(query).all())
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { name, description, prep_time, ingredients = [], recipe = [], image_url } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Navn er påkrævet' }, { status: 400 })

  const result = db.prepare(`
    INSERT INTO meals (name, description, prep_time, ingredients, recipe, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), description || null, prep_time || null, JSON.stringify(ingredients), JSON.stringify(recipe), image_url || null)

  return NextResponse.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid), { status: 201 })
}
