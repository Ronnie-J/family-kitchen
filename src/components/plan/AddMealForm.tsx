'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

type Props = {
  onSaved: () => void
  onCancel: () => void
}

export default function AddMealForm({ onSaved, onCancel }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [recipe, setRecipe] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!name.trim()) { setError('Navn er påkrævet'); return }
    setSaving(true)
    setError('')
    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        prep_time: prepTime ? parseInt(prepTime) : null,
        ingredients: ingredients.split('\n').map(s => s.trim()).filter(Boolean),
        recipe: recipe.split('\n').map(s => s.trim()).filter(Boolean),
        is_favorite: true,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="p-4 bg-orange-50 border-t border-orange-100 space-y-3">
      <div className="font-semibold text-stone-700 text-sm">Ny opskrift</div>

      <div>
        <label className="text-xs text-stone-500 font-medium">Navn *</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Fx Lasagne"
          className="w-full mt-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-500 font-medium">Beskrivelse</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Kort beskrivelse"
            className="w-full mt-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 font-medium">Tilberedningstid (min)</label>
          <input
            type="number"
            value={prepTime}
            onChange={e => setPrepTime(e.target.value)}
            placeholder="30"
            min={1}
            className="w-full mt-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-stone-500 font-medium">Ingredienser — én per linje</label>
        <textarea
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
          rows={4}
          placeholder={'500g hakket oksekød\n2 dåser hakkede tomater\n400g spaghetti'}
          className="w-full mt-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-stone-500 font-medium">Fremgangsmåde — ét trin per linje</label>
        <textarea
          value={recipe}
          onChange={e => setRecipe(e.target.value)}
          rows={4}
          placeholder={'Brun løg og hvidløg i olie.\nTilsæt kødet og brun grundigt.\nHæld tomater i og lad simre 20 min.'}
          className="w-full mt-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <Check size={14} /> {saving ? 'Gemmer…' : 'Gem opskrift'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-xl font-medium hover:bg-stone-50 transition-colors"
        >
          <X size={14} /> Annuller
        </button>
      </div>
    </div>
  )
}
