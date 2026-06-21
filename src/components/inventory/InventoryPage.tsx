'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Trash2, Edit3, Snowflake, Package, X, Camera, Barcode, ChevronDown } from 'lucide-react'
import type { InventoryItem } from '@/lib/db'

const CATEGORIES = ['kød', 'fisk', 'grønt', 'mejeri', 'desserter', 'andet'] as const
const CATEGORY_COLORS: Record<string, string> = {
  kød:      'bg-red-100 text-red-700',
  fisk:     'bg-blue-100 text-blue-700',
  grønt:    'bg-green-100 text-green-700',
  mejeri:   'bg-yellow-100 text-yellow-700',
  desserter:'bg-pink-100 text-pink-700',
  andet:    'bg-purple-100 text-purple-700',
}

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.andet
  const label = category.charAt(0).toUpperCase() + category.slice(1)
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}>
      {label}
    </span>
  )
}

type AddMode = 'manual' | 'barcode' | 'photo'

export default function InventoryPage() {
  const [location, setLocation] = useState<'freezer' | 'pantry'>('pantry')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('alle')
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('manual')
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', category: 'andet', quantity: '', note: '' })
  const [formLocation, setFormLocation] = useState<'pantry' | 'freezer'>('pantry')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/inventory?location=${location}`)
    setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [location])

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'alle' || i.category === catFilter
    return matchSearch && matchCat
  })

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', category: 'andet', quantity: '', note: '' })
    setFormLocation(location)
    setAddMode('manual')
    setBarcodeInput('')
    setShowAdd(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditItem(item)
    setForm({ name: item.name, category: item.category, quantity: item.quantity || '', note: item.note || '' })
    setFormLocation(item.location)
    setAddMode('manual')
    setShowAdd(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    const payload = { ...form, location: formLocation }
    if (editItem) {
      await fetch(`/api/inventory/${editItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/inventory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    setShowAdd(false)
    load()
  }

  const handleRemove = async (id: number) => {
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    load()
  }

  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) return
    setBarcodeLoading(true)
    const res = await fetch(`/api/barcode?code=${barcodeInput.trim()}`)
    const data = await res.json()
    setBarcodeLoading(false)
    if (data.name) {
      setForm(f => ({ ...f, name: data.name, category: data.category || 'andet' }))
      setAddMode('manual')
    } else {
      alert(data.error || 'Produkt ikke fundet')
    }
  }

  const handlePhotoAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/vision', { method: 'POST', body: fd })
    const data = await res.json()
    setPhotoLoading(false)
    if (data.name) {
      setForm(f => ({ ...f, name: data.name, category: data.category || 'andet' }))
      setAddMode('manual')
    } else {
      alert(data.error || 'Kunne ikke genkende produkt')
    }
  }

  const daysOld = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / 86400000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-stone-800">Lager</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
          <Plus size={16} /> Tilføj
        </button>
      </div>

      {/* Location tabs */}
      <div className="flex bg-stone-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setLocation('pantry')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${location === 'pantry' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
        >
          <Package size={15} /> Spisekammer
        </button>
        <button
          onClick={() => setLocation('freezer')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${location === 'freezer' ? 'bg-white text-blue-600 shadow-sm' : 'text-stone-500'}`}
        >
          <Snowflake size={15} /> Fryser
        </button>
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søg varer..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="alle">Alle</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {/* Items */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">Indlæser...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400 text-sm">{search ? 'Ingen varer matcher søgningen' : `${location === 'freezer' ? 'Fryseren' : 'Spisekammeret'} er tomt`}</p>
          <button onClick={openAdd} className="mt-3 text-orange-500 text-sm font-medium">+ Tilføj vare</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const old = daysOld(item.added_at)
            const warn = (location === 'freezer' && old > 90) || (location === 'pantry' && old > 30)
            return (
              <div key={item.id} className={`bg-white rounded-xl border ${warn ? 'border-amber-200' : 'border-stone-100'} p-3.5 flex items-center gap-3`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-800">{item.name}</span>
                    <CategoryBadge category={item.category} />
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.quantity && <span className="text-xs text-stone-500">{item.quantity}</span>}
                    {item.note && <span className="text-xs text-stone-400 italic">{item.note}</span>}
                    {warn && <span className="text-xs text-amber-600 font-medium">⚠ {old} dage gammel</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => handleRemove(item.id)} className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-800">{editItem ? 'Rediger vare' : 'Tilføj vare'}</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-stone-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {!editItem && (
              <div className="flex border-b border-stone-100">
                {([['manual', 'Manuel', null], ['barcode', 'Stregkode', Barcode], ['photo', 'Foto', Camera]] as const).map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    onClick={() => setAddMode(mode)}
                    className={`flex-1 py-3 text-sm font-medium flex flex-col items-center gap-1 transition-colors ${addMode === mode ? 'text-orange-500 border-b-2 border-orange-500' : 'text-stone-500'}`}
                  >
                    {Icon && <Icon size={16} />}
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 space-y-3">
              {addMode === 'barcode' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Stregkode-nummer</label>
                  <div className="flex gap-2">
                    <input
                      value={barcodeInput}
                      onChange={e => setBarcodeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                      placeholder="Scan eller indtast stregkode"
                      className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <button
                      onClick={handleBarcodeLookup}
                      disabled={barcodeLoading}
                      className="bg-orange-500 text-white px-4 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                    >
                      {barcodeLoading ? '...' : 'Slå op'}
                    </button>
                  </div>
                  <p className="text-xs text-stone-400">Tast stregkode-nummeret fra produktets bagside</p>
                </div>
              )}

              {addMode === 'photo' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Tag foto af varen</label>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={photoLoading}
                    className="w-full border-2 border-dashed border-stone-200 rounded-xl py-8 text-center hover:border-orange-300 transition-colors"
                  >
                    {photoLoading ? (
                      <div className="text-stone-500 text-sm">AI analyserer billedet...</div>
                    ) : (
                      <div className="space-y-1">
                        <Camera size={24} className="mx-auto text-stone-400" />
                        <div className="text-sm text-stone-500">Tryk for at åbne kamera</div>
                        <div className="text-xs text-stone-400">AI genkender produktet automatisk</div>
                      </div>
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoAnalysis} className="hidden" />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Navn *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="fx Hakket oksekød"
                  className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Kategori</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Mængde</label>
                <input
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="fx 500g, 2 pakker, ½ bakke"
                  className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Bemærkning</label>
                <input
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="fx Udløber snart, halv pakke"
                  className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Placering</label>
                <div className="flex gap-2 mt-1">
                  {(['pantry', 'freezer'] as const).map(loc => (
                    <button
                      key={loc}
                      onClick={() => setFormLocation(loc)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        formLocation === loc ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-stone-200 text-stone-500'
                      }`}
                    >
                      {loc === 'pantry' ? 'Spisekammer' : 'Fryser'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.name.trim()}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 transition-colors mt-2"
              >
                {editItem ? 'Gem ændringer' : 'Tilføj til lager'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
