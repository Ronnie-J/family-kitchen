'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Send, Trash2, Check, X } from 'lucide-react'
import type { ShoppingItem } from '@/lib/db'

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export default function ShoppingPage() {
  const [weekStart] = useState(getWeekStart)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newQty, setNewQty] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/shopping?week=${weekStart}`)
    const data = await res.json()
    setItems(data.items)
    setLoading(false)
  }

  useEffect(() => { load() }, [weekStart])

  const generate = async () => {
    setGenerating(true)
    const res = await fetch('/api/shopping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, action: 'generate' }),
    })
    const data = await res.json()
    setGenerating(false)
    load()
  }

  const addItem = async () => {
    if (!newItem.trim()) return
    await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.trim(), quantity: newQty.trim() || null, week_start: weekStart }),
    })
    setNewItem('')
    setNewQty('')
    setShowAdd(false)
    load()
  }

  const toggle = async (id: number, checked: boolean) => {
    await fetch(`/api/shopping/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_checked: checked }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: checked ? 1 : 0 } : i))
  }

  const remove = async (id: number) => {
    await fetch(`/api/shopping/${id}`, { method: 'DELETE' })
    load()
  }

  const sendTelegram = async () => {
    setSending(true)
    const res = await fetch('/api/telegram/send', { method: 'POST' })
    const data = await res.json()
    setSending(false)
    setSendResult(data.ok ? 'Besked sendt til Telegram!' : `Fejl: ${data.error}`)
    setTimeout(() => setSendResult(null), 4000)
  }

  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)
  const permanent = items.filter(i => i.is_permanent)
  const weekly = items.filter(i => !i.is_permanent)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-stone-800">Indkøb</h1>
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 border border-stone-200 bg-white text-stone-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? '...' : 'Fra plan'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600"
          >
            <Plus size={15} /> Tilføj
          </button>
        </div>
      </div>

      {sendResult && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${sendResult.includes('Fejl') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {sendResult}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-400">Indlæser...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400 text-sm">Indkøbslisten er tom</p>
          <button onClick={generate} className="mt-2 text-orange-500 text-sm">Generer fra ugeplanen</button>
        </div>
      ) : (
        <div className="space-y-4">
          {unchecked.length > 0 && (
            <div className="space-y-2">
              {unchecked.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-stone-100 px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => toggle(item.id, true)}
                    className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-orange-400 transition-colors shrink-0 flex items-center justify-center"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-stone-800 text-sm">{item.name}</span>
                    {item.quantity && <span className="text-stone-400 text-xs ml-1.5">({item.quantity})</span>}
                    {item.is_permanent ? <span className="ml-2 text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">Fast</span> : null}
                  </div>
                  <button onClick={() => remove(item.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {checked.length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wide px-1 mb-2">Fundet ({checked.length})</div>
              <div className="space-y-2">
                {checked.map(item => (
                  <div key={item.id} className="bg-stone-50 rounded-xl border border-stone-100 px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => toggle(item.id, false)}
                      className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center shrink-0"
                    >
                      <Check size={12} className="text-white" />
                    </button>
                    <span className="flex-1 text-stone-400 line-through text-sm">{item.name}</span>
                    <button onClick={() => remove(item.id)} className="text-stone-300 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send to Telegram */}
      <div className="mt-6 pt-4 border-t border-stone-100">
        <button
          onClick={sendTelegram}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#0088cc] text-white rounded-xl font-semibold text-sm hover:bg-[#0077bb] disabled:opacity-50 transition-colors"
        >
          <Send size={16} />
          {sending ? 'Sender...' : 'Send ugeplanen til Telegram'}
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-800">Tilføj vare</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Vare *</label>
                <input
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  placeholder="fx Tomater"
                  autoFocus
                  className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Mængde</label>
                <input
                  value={newQty}
                  onChange={e => setNewQty(e.target.value)}
                  placeholder="fx 500g, 1 bakke"
                  className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <button
                onClick={addItem}
                disabled={!newItem.trim()}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-40"
              >
                Tilføj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
