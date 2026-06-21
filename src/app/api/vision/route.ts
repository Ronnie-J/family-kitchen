import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  const db = getDb()
  const getS = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''

  const apiKey = getS('gemini_api_key')
  if (!apiKey) return NextResponse.json({ error: 'Gemini API-nøgle mangler i indstillinger' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'Ingen billed-data modtaget' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          {
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

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Kunne ikke genkende produkt' }, { status: 422 })

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (e) {
    const msg = String(e)
    const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')
    const friendlyError = isQuota
      ? 'Gemini kvote overskredet. Brug en nøgle fra aistudio.google.com for gratis adgang.'
      : msg
    return NextResponse.json({ error: friendlyError }, { status: isQuota ? 429 : 500 })
  }
}
