import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(id)
  if (!meal) return NextResponse.json({ error: 'Ret ikke fundet' }, { status: 404 })
  return NextResponse.json(meal)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  const body = await req.json()
  const { name, description, prep_time, ingredients, image_url, is_favorite, exclude_from_suggestions } = body

  const meal = db.prepare('SELECT id FROM meals WHERE id = ?').get(id)
  if (!meal) return NextResponse.json({ error: 'Ret ikke fundet' }, { status: 404 })

  db.prepare(`
    UPDATE meals SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      prep_time = COALESCE(?, prep_time),
      ingredients = COALESCE(?, ingredients),
      image_url = COALESCE(?, image_url),
      is_favorite = COALESCE(?, is_favorite),
      exclude_from_suggestions = COALESCE(?, exclude_from_suggestions)
    WHERE id = ?
  `).run(
    name ?? null, description ?? null, prep_time ?? null,
    ingredients ? JSON.stringify(ingredients) : null,
    image_url ?? null,
    is_favorite !== undefined ? (is_favorite ? 1 : 0) : null,
    exclude_from_suggestions !== undefined ? (exclude_from_suggestions ? 1 : 0) : null,
    id
  )

  return NextResponse.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  db.prepare('DELETE FROM meals WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
