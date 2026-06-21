import { NextRequest, NextResponse } from 'next/server'

const CATEGORY_MAP: Record<string, string> = {
  'en:meats': 'kød',
  'en:fish': 'fisk',
  'en:seafood': 'fisk',
  'en:vegetables': 'grønt',
  'en:fruits': 'grønt',
  'en:dairies': 'mejeri',
  'en:frozen-foods': 'andet',
  'en:desserts': 'desserter',
  'en:beverages': 'andet',
}

function mapCategory(categories: string): string {
  if (!categories) return 'andet'
  const cats = categories.split(',').map(c => c.trim().toLowerCase())
  for (const cat of cats) {
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
      if (cat.includes(key.replace('en:', ''))) return val
    }
  }
  if (cats.some(c => c.includes('meat') || c.includes('chicken') || c.includes('beef') || c.includes('pork'))) return 'kød'
  if (cats.some(c => c.includes('fish') || c.includes('seafood'))) return 'fisk'
  if (cats.some(c => c.includes('vegetable') || c.includes('fruit') || c.includes('salad'))) return 'grønt'
  if (cats.some(c => c.includes('dairy') || c.includes('milk') || c.includes('cheese') || c.includes('yogurt'))) return 'mejeri'
  if (cats.some(c => c.includes('dessert') || c.includes('ice cream') || c.includes('cake'))) return 'desserter'
  return 'andet'
}

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('code')
  if (!barcode) return NextResponse.json({ error: 'Stregkode mangler' }, { status: 400 })

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,categories,image_url`, {
      headers: { 'User-Agent': 'FamilyKitchen/1.0 (self-hosted)' },
    })
    const data = await res.json() as {
      status: number
      product?: { product_name?: string; categories?: string; image_url?: string }
    }

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Produkt ikke fundet' }, { status: 404 })
    }

    const p = data.product
    return NextResponse.json({
      name: p.product_name || '',
      category: mapCategory(p.categories || ''),
      image_url: p.image_url || null,
      barcode,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
