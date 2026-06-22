'use client'

import { useState } from 'react'
import { Star, X } from 'lucide-react'

const TAGS = [
  { id: 'børnevenlig', label: 'Børnevenlig', emoji: '👶' },
  { id: 'hurtig', label: 'Under 30 min', emoji: '⚡' },
  { id: 'søndagsret', label: 'Søndagsret', emoji: '☀️' },
  { id: 'ikke_igen', label: 'Ikke igen', emoji: '🚫' },
  { id: 'vegetarisk', label: 'Vegetarisk', emoji: '🌱' },
  { id: 'festret', label: 'Festret', emoji: '🎉' },
]

type Props = {
  mealId: number
  mealName: string
  onClose: () => void
  onSaved: () => void
}

export default function RatingModal({ mealId, mealName, onClose, onSaved }: Props) {
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggleTag = (id: string) => {
    if (id === 'ikke_igen') {
      setSelectedTags(p => p.includes(id) ? p.filter(t => t !== id) : [id])
    } else {
      setSelectedTags(p => p.includes(id) ? p.filter(t => t !== id) : [...p.filter(t => t !== 'ikke_igen'), id])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/meals/${mealId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars, tags: selectedTags, mark_as_made: true }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">Bedøm retten</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="text-center">
            <div className="font-semibold text-stone-700 mb-3">{mealName}</div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${n <= (hovered || stars) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <div className="mt-1 text-sm text-stone-500">
                {['', 'Ikke god', 'Okay', 'God', 'Meget god', 'Fantastisk!'][stars]}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Kategorier</div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag.id)
                      ? tag.id === 'ikke_igen'
                        ? 'bg-red-100 text-red-600 border border-red-200'
                        : 'bg-orange-100 text-orange-600 border border-orange-200'
                      : 'bg-stone-100 text-stone-600 border border-stone-100 hover:bg-stone-200'
                  }`}
                >
                  {tag.emoji} {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50">
              Spring over
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Gemmer...' : 'Gem bedømmelse'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
