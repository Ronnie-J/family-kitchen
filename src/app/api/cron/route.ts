import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendTelegramMessage, buildWeeklyMessage } from '@/lib/telegram'

// Called by server.ts cron job every Sunday
export async function POST() {
  const db = getDb()
  const getS = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''

  const botToken = getS('telegram_bot_token')
  const chatId = getS('telegram_chat_id')

  if (!botToken || !chatId) {
    return NextResponse.json({ ok: false, reason: 'Telegram ikke konfigureret' })
  }

  const text = buildWeeklyMessage()
  const result = await sendTelegramMessage(text)
  return NextResponse.json(result)
}
