import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  const body = await req.json()
  const { name, category, quantity, note, location } = body

  const item = db.prepare('SELECT id FROM inventory_items WHERE id = ? AND removed_at IS NULL').get(id)
  if (!item) return NextResponse.json({ error: 'Vare ikke fundet' }, { status: 404 })

  db.prepare(`
    UPDATE inventory_items SET name = ?, category = ?, quantity = ?, note = ?, location = ?
    WHERE id = ?
  `).run(name, category, quantity || null, note || null, location, id)

  return NextResponse.json(db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id))
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  db.prepare(`UPDATE inventory_items SET removed_at = datetime('now', 'localtime') WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
