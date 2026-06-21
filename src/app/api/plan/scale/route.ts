import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Mistral } from '@mistralai/mistralai'

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { name, ingredients } = body as { name: string; ingredients: string[] }

  const getS = (key: string) =>
    (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''

  const apiKey = getS('mistral_api_key')
  if (!apiKey) return NextResponse.json({ ingredients })

  const model = getS('mistral_model') || 'mistral-small-latest'
  const persons = (parseInt(getS('family_adults')) || 2) + (parseInt(getS('family_children')) || 0)

  const prompt = `Du har en opskrift på "${name}" til ${persons} personer (1 dag). Juster ingrediensmængderne så der er nok til 2 dage — altså at man laver dobbelt portion dag 1 og gemmer rester til dag 2.

Ingredienser til ${persons} personer / 1 dag:
${ingredients.map(i => `- ${i}`).join('\n')}

Regler:
- Primæringredienser (kød, fisk, pasta, ris, kartofler, bønner) fordobles
- Smaggivere (hvidløg, løg, krydderier, olie) øges med ca. 50%
- Væsker (bouillon, fløde, kokosmælk) fordobles

Returnér KUN et JSON-array med de justerede ingredienser på dansk (ingen markdown, ingen forklaring):
["800g hakket oksekød", "4 dåser hakkede tomater", "600g spaghetti"]`

  try {
    const client = new Mistral({ apiKey })
    db.prepare(`INSERT INTO ai_logs (type, model, prompt) VALUES (?, ?, ?)`).run('scale', model, prompt)

    const response = await client.chat.complete({
      model,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (response.choices?.[0]?.message?.content as string) ?? ''
    db.prepare(`UPDATE ai_logs SET response_preview = ? WHERE id = last_insert_rowid()`).run(text.slice(0, 300))

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ ingredients })

    return NextResponse.json({ ingredients: JSON.parse(jsonMatch[0]) })
  } catch {
    return NextResponse.json({ ingredients })
  }
}
