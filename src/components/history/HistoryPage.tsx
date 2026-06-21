'use client'

import { useState, useEffect } from 'react'
import { Star, ChevronDown } from 'lucide-react'
import type { MealHistory } from '@/lib/db'

const TAG_LABELS: Record<string, string> = {
  børnevenlig: '👶 Børnevenlig',
  hurtig: '⚡ Hurtig',
  søndagsret: '☀️ Søndagsret',
  ny_favorit: '❤️ Favorit',
  ikke_igen: '🚫 Ikke igen',
  vegetarisk: '🌱 Vegetarisk',
  festret: '🎉 Festret',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default function HistoryPage() {
  const [items, setItems] = useState<MealHistory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  const load = async (reset = false) => {
    setLoading(true)
    const o = reset ? 0 : offset
    const res = await fetch(`/api/history?limit=${LIMIT}&offset=${o}`)
    const data = await res.json()
    setItems(prev => reset ? data.items : [...prev, ...data.items])
    setTotal(data.total)
    setOffset(o + LIMIT)
    setLoading(false)
  }

  useEffect(() => { load(true) }, [])

  const renderStars = (n: number | null) => {
    if (!n) return null
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={12} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-stone-200'} />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Madhistorik</h1>
        <span className="text-sm text-stone-400">{total} retter</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center py-12 text-stone-400">Indlæser...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400 text-sm">Ingen madhistorik endnu</p>
          <p className="text-stone-300 text-xs mt-1">Markér retter som "lavet" i ugeplanen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const tags = JSON.parse(item.tags || '[]') as string[]
            return (
              <div key={item.id} className="bg-white rounded-xl border border-stone-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stone-800">{item.meal_name}</div>
                    <div className="text-xs text-stone-400 mt-0.5 capitalize">{formatDate(item.made_at)}</div>
                    {item.made_by && <div className="text-xs text-stone-400">Lavet af {item.made_by}</div>}
                  </div>
                  {renderStars(item.stars)}
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {tags.map(tag => (
                      <span key={tag} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                        {TAG_LABELS[tag] || tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {items.length < total && (
            <button
              onClick={() => load()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-stone-500 hover:text-stone-700 border border-stone-200 rounded-xl bg-white hover:bg-stone-50"
            >
              <ChevronDown size={15} />
              {loading ? 'Indlæser...' : `Vis mere (${total - items.length} tilbage)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
