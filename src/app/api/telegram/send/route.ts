import { NextResponse } from 'next/server'
import { sendTelegramMessage, buildWeeklyMessage } from '@/lib/telegram'

export async function POST() {
  const text = buildWeeklyMessage()
  const result = await sendTelegramMessage(text)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, message: text })
}
