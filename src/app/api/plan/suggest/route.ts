import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { days = 5, excluded_days = [] } = body

  const getS = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''

  const apiKey = getS('anthropic_api_key')
  if (!apiKey) return NextResponse.json({ error: 'Anthropic API-nøgle mangler i indstillinger' }, { status: 400 })

  const inventory = db.prepare(`
    SELECT name, category, quantity, location FROM inventory_items
    WHERE removed_at IS NULL ORDER BY location, category, name
  `).all() as { name: string; category: string; quantity: string; location: string }[]

  const recentHistory = db.prepare(`
    SELECT meal_name, made_at, stars FROM meal_history
    ORDER BY made_at DESC LIMIT 20
  `).all() as { meal_name: string; made_at: string; stars: number }[]

  const favorites = db.prepare(`
    SELECT name, description, avg_rating, ingredients FROM meals
    WHERE is_favorite = 1 AND exclude_from_suggestions = 0
    ORDER BY avg_rating DESC LIMIT 10
  `).all() as { name: string; description: string; avg_rating: number; ingredients: string }[]

  const adults = getS('family_adults')
  const children = getS('family_children')
  const childAges = getS('family_children_ages')
  const allergies = getS('allergies')
  const kitchenType = getS('kitchen_type')
  const aiPreferences = getS('ai_preferences')

  const freezerItems = inventory.filter(i => i.location === 'freezer')
  const pantryItems = inventory.filter(i => i.location === 'pantry')

  const prompt = `Du er en familiekogebog-assistent. Foreslå ${days} middagsretter til en dansk familie.

FAMILIEPROFIL:
- ${adults} voksne og ${children} børn (alder: ${childAges || 'ikke angivet'})
- Allergier/præferencer: ${allergies || 'ingen'}
- Køkkentype: ${kitchenType}
- Madpræferencer: ${aiPreferences}

LAGER – FRYSER:
${freezerItems.length > 0 ? freezerItems.map(i => `- ${i.name} (${i.category})${i.quantity ? ` – ${i.quantity}` : ''}`).join('\n') : 'Tomt'}

LAGER – SPISEKAMMER:
${pantryItems.length > 0 ? pantryItems.map(i => `- ${i.name} (${i.category})${i.quantity ? ` – ${i.quantity}` : ''}`).join('\n') : 'Tomt'}

SENESTE RETTER (undgå gentagelse):
${recentHistory.length > 0 ? recentHistory.map(h => `- ${h.meal_name} (${h.made_at.split('T')[0]})`).join('\n') : 'Ingen historik'}

FAVORITTER (forsøg at inkludere 1-2):
${favorites.length > 0 ? favorites.map(f => `- ${f.name} (${f.avg_rating.toFixed(1)}★)`).join('\n') : 'Ingen favoritter endnu'}

Returnér præcis et JSON-array med ${days} retter i dette format:
[
  {
    "name": "Rettens navn",
    "description": "Kort beskrivelse (1-2 sætninger)",
    "prep_time": 30,
    "ingredients": ["ingrediens 1", "ingrediens 2"],
    "uses_inventory": true
  }
]

Prioritér retter der bruger det der allerede er på lager. Varier between hurtige hverdagsretter og lidt mere festlige retter til weekend. Alle navne og tekster skal være på dansk.`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Uventet svar fra AI')

    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Kunne ikke parse AI-svar')

    const suggestions = JSON.parse(jsonMatch[0])

    const unsplashKey = getS('unsplash_access_key')
    const enriched = await Promise.all(suggestions.map(async (s: {
      name: string; description: string; prep_time: number; ingredients: string[]; uses_inventory: boolean
    }) => {
      let image_url = null
      if (unsplashKey) {
        try {
          const imgRes = await fetch(
            `https://api.unsplash.com/photos/random?query=${encodeURIComponent(s.name + ' food')}&orientation=landscape`,
            { headers: { Authorization: `Client-ID ${unsplashKey}` } }
          )
          const imgData = await imgRes.json() as { urls?: { regular: string } }
          image_url = imgData.urls?.regular || null
        } catch { /* no image */ }
      }
      return { ...s, image_url }
    }))

    return NextResponse.json({ suggestions: enriched })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
