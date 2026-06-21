import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Mistral } from '@mistralai/mistralai'

export async function POST(req: NextRequest) {
  const db = getDb()
  const getS = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''

  const apiKey = getS('mistral_api_key')
  if (!apiKey) return NextResponse.json({ error: 'Mistral API-nøgle mangler i indstillinger' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'Ingen billed-data modtaget' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  try {
    const client = new Mistral({ apiKey })
    const visionPrompt = `Identificer dette madvareprodukt på billedet. Returnér KUN et JSON-objekt med disse felter:\n{"name": "Produktets navn på dansk", "category": "én af: kød, fisk, grønt, mejeri, desserter, andet"}\nHvis du ikke kan identificere produktet, gæt baseret på hvad du ser.`
    db.prepare(`INSERT INTO ai_logs (type, model, prompt) VALUES (?, ?, ?)`).run('vision', 'pixtral-12b-2409', `[Billedanalyse – base64 billede]\n\n${visionPrompt}`)

    const response = await client.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            imageUrl: { url: `data:${mimeType};base64,${base64}` },
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

    const text = (response.choices?.[0]?.message?.content as string) ?? ''
    db.prepare(`UPDATE ai_logs SET response_preview = ? WHERE id = last_insert_rowid()`).run(text.slice(0, 300))

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Kunne ikke genkende produkt' }, { status: 422 })

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (e) {
    const msg = String(e)
    const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('rate')
    return NextResponse.json({
      error: isQuota ? 'Mistral rate limit nået. Prøv igen om lidt.' : msg
    }, { status: isQuota ? 429 : 500 })
  }
}
