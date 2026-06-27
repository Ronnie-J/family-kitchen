import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getWeekStart } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const db = getDb()
  const week = req.nextUrl.searchParams.get('week') || getWeekStart()

  const items = db.prepare(`
    SELECT * FROM shopping_items
    WHERE week_start = ? OR is_permanent = 1
    ORDER BY is_permanent DESC, is_checked ASC, name ASC
  `).all(week) as { id: number; name: string; is_permanent: number; is_checked: number; quantity: string | null; week_start: string | null }[]

  const permanentSetting = (db.prepare('SELECT value FROM settings WHERE key = ?').get('permanent_shopping_items') as { value: string } | undefined)?.value ?? ''
  const existingNames = new Set(items.map(i => i.name.toLowerCase()))
  const settingItems = permanentSetting
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !existingNames.has(s.toLowerCase()))
    .map((s, idx) => ({ id: -(idx + 1), name: s, quantity: null, week_start: null, is_permanent: 1, is_checked: 0 }))

  return NextResponse.json({ week_start: week, items: [...settingItems, ...items] })
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { name, quantity, week_start, is_permanent = false } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Navn er påkrævet' }, { status: 400 })

  const result = db.prepare(`
    INSERT INTO shopping_items (name, quantity, week_start, is_permanent)
    VALUES (?, ?, ?, ?)
  `).run(name.trim(), quantity || null, is_permanent ? null : (week_start || getWeekStart()), is_permanent ? 1 : 0)

  return NextResponse.json(db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(result.lastInsertRowid), { status: 201 })
}

export async function PUT(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { week_start, action } = body

  const week = week_start || getWeekStart()

  if (action === 'generate') {
    const plan = db.prepare(`
      SELECT meal_ingredients FROM weekly_plan
      WHERE week_start = ? AND status NOT IN ('eaten_out', 'no_cooking') AND meal_name IS NOT NULL
    `).all(week) as { meal_ingredients: string }[]

    const inventory = db.prepare(`
      SELECT name FROM inventory_items WHERE removed_at IS NULL
    `).all() as { name: string }[]
    const inventoryNames = inventory.map(i => i.name.toLowerCase())

    db.prepare(`DELETE FROM shopping_items WHERE week_start = ? AND is_permanent = 0`).run(week)

    const addedIngredients = new Set<string>()
    for (const entry of plan) {
      try {
        const ingredients: string[] = JSON.parse(entry.meal_ingredients || '[]')
        for (const ing of ingredients) {
          const ingLower = ing.toLowerCase()
          const alreadyInStock = inventoryNames.some(n => ingLower.includes(n) || n.includes(ingLower.split(' ')[0]))
          if (!alreadyInStock && !addedIngredients.has(ingLower)) {
            addedIngredients.add(ingLower)
            db.prepare(`INSERT INTO shopping_items (name, week_start) VALUES (?, ?)`).run(ing, week)
          }
        }
      } catch { /* skip */ }
    }

    return NextResponse.json({ ok: true, generated: addedIngredients.size })
  }

  return NextResponse.json({ error: 'Ukendt handling' }, { status: 400 })
}
