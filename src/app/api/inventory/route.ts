import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
  const location = req.nextUrl.searchParams.get('location')
  const query = location
    ? 'SELECT * FROM inventory_items WHERE removed_at IS NULL AND location = ? ORDER BY added_at DESC'
    : 'SELECT * FROM inventory_items WHERE removed_at IS NULL ORDER BY location, added_at DESC'
  const items = location
    ? db.prepare(query).all(location)
    : db.prepare(query).all()
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { name, category = 'andet', quantity, note, location = 'pantry', barcode, image_url } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Navn er påkrævet' }, { status: 400 })

  const result = db.prepare(`
    INSERT INTO inventory_items (name, category, quantity, note, location, barcode, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name.trim(), category, quantity || null, note || null, location, barcode || null, image_url || null)

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(item, { status: 201 })
}
