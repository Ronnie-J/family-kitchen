import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  rows.forEach(r => { settings[r.key] = r.value })
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const db = getDb()
  const body = await req.json() as Record<string, string>

  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const updateAll = db.transaction((data: Record<string, string>) => {
    for (const [key, value] of Object.entries(data)) {
      update.run(key, String(value))
    }
  })
  updateAll(body)

  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  rows.forEach(r => { settings[r.key] = r.value })
  return NextResponse.json(settings)
}
