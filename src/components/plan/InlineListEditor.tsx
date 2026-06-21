'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'

type Props = {
  label: string
  items: string[]
  ordered?: boolean
  onSave: (items: string[]) => Promise<void>
}

export default function InlineListEditor({ label, items, ordered = false, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const open = () => {
    setDraft(items.join('\n'))
    setEditing(true)
  }

  const cancel = () => setEditing(false)

  const save = async () => {
    setSaving(true)
    const updated = draft.split('\n').map(s => s.trim()).filter(Boolean)
    await onSave(updated)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{label}</div>
        {!editing && (
          <button
            onClick={open}
            className="p-1 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-500 transition-colors"
            title={`Rediger ${label.toLowerCase()}`}
          >
            <Pencil size={11} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={Math.max(3, items.length + 1)}
            placeholder={ordered ? 'Ét trin per linje…' : 'Én ingrediens per linje…'}
            className="w-full text-xs border border-orange-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none leading-relaxed"
          />
          <div className="flex gap-1.5">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 text-xs bg-orange-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
            >
              <Check size={11} /> {saving ? 'Gemmer…' : 'Gem'}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1 text-xs bg-stone-100 text-stone-600 px-2.5 py-1.5 rounded-lg hover:bg-stone-200 font-medium"
            >
              <X size={11} /> Annuller
            </button>
          </div>
        </div>
      ) : ordered ? (
        <ol className="space-y-1.5">
          {items.map((step, i) => (
            <li key={i} className="flex gap-2 text-xs text-stone-600">
              <span className="shrink-0 w-4 h-4 bg-orange-100 text-orange-600 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          {items.map((ing, i) => (
            <li key={i} className="text-xs text-stone-600 flex items-start gap-1">
              <span className="text-orange-300 shrink-0 mt-0.5">·</span>{ing}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
