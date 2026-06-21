import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0')

  const items = db.prepare(`
    SELECT * FROM meal_history ORDER BY made_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset)

  const total = (db.prepare('SELECT COUNT(*) as count FROM meal_history').get() as { count: number }).count

  return NextResponse.json({ items, total })
}
