import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  const body = await req.json()
  const { is_checked, name, quantity } = body

  if (is_checked !== undefined) {
    db.prepare('UPDATE shopping_items SET is_checked = ? WHERE id = ?').run(is_checked ? 1 : 0, id)
  } else {
    db.prepare('UPDATE shopping_items SET name = ?, quantity = ? WHERE id = ?').run(name, quantity || null, id)
  }

  return NextResponse.json(db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb()
  const { id } = await params
  db.prepare('DELETE FROM shopping_items WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
