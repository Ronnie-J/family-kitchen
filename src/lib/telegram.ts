import { getDb } from './db'

export async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb()
  const getS = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''

  const botToken = getS('telegram_bot_token')
  const chatId = getS('telegram_chat_id')

  if (!botToken || !chatId) {
    return { ok: false, error: 'Telegram bot-token eller chat-ID mangler i indstillinger' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })
    const data = await res.json() as { ok: boolean; description?: string }
    if (!data.ok) return { ok: false, error: data.description }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export function buildWeeklyMessage(): string {
  const db = getDb()

  const weekStart = getWeekStart()
  const plan = db.prepare(`
    SELECT day_of_week, meal_name, status FROM weekly_plan
    WHERE week_start = ? ORDER BY day_of_week
  `).all(weekStart) as { day_of_week: number; meal_name: string | null; status: string }[]

  const shopping = db.prepare(`
    SELECT name, quantity FROM shopping_items
    WHERE (week_start = ? OR is_permanent = 1) AND is_checked = 0
    ORDER BY is_permanent DESC, name
  `).all(weekStart) as { name: string; quantity: string | null }[]

  const dayNames = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']

  let msg = `*🍽️ Ugeplan – uge ${getWeekNumber(new Date())}*\n\n`

  for (let i = 0; i < 7; i++) {
    const entry = plan.find(p => p.day_of_week === i)
    if (!entry || entry.status === 'no_cooking') continue
    const emoji = entry.status === 'eaten_out' ? '🍕' : '🍳'
    const name = entry.status === 'eaten_out' ? 'Spiser ude' : (entry.meal_name || '–')
    msg += `${emoji} *${dayNames[i]}:* ${name}\n`
  }

  if (shopping.length > 0) {
    msg += `\n*🛒 Indkøbsliste:*\n`
    shopping.forEach(item => {
      msg += `• ${item.name}${item.quantity ? ` (${item.quantity})` : ''}\n`
    })
  }

  const lowStock = db.prepare(`
    SELECT name FROM inventory_items
    WHERE removed_at IS NULL
    AND added_at < datetime('now', '-14 days', 'localtime')
    ORDER BY added_at LIMIT 5
  `).all() as { name: string }[]

  if (lowStock.length > 0) {
    msg += `\n*⚠️ Har ligget længe på lager:*\n`
    lowStock.forEach(item => { msg += `• ${item.name}\n` })
  }

  return msg
}

export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  // Brug lokale tidszone-felter — toISOString() er UTC og rykker datoen i CEST
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const dayStr = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayStr}`
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
