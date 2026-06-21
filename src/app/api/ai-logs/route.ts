import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const logs = db.prepare(`
    SELECT id, sent_at, type, model, prompt, response_preview
    FROM ai_logs ORDER BY sent_at DESC LIMIT 50
  `).all()
  return NextResponse.json(logs)
}

export async function DELETE(req: NextRequest) {
  const db = getDb()
  db.prepare('DELETE FROM ai_logs').run()
  return NextResponse.json({ ok: true })
}
