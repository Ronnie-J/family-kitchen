import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const db = getDb()
  const getS = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''

  const apiKey = getS('anthropic_api_key')
  if (!apiKey) return NextResponse.json({ error: 'Anthropic API-nøgle mangler' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'Ingen billed-data modtaget' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Identificer dette madvareprodukt på billedet. Returnér KUN et JSON-objekt med disse felter:
{
  "name": "Produktets navn på dansk",
  "category": "én af: kød, fisk, grønt, mejeri, desserter, andet"
}
Hvis du ikke kan identificere produktet, gæt baseret på hvad du ser.`,
          },
        ],
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Kunne ikke genkende produkt' }, { status: 422 })

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
