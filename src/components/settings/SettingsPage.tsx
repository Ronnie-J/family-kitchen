'use client'

import { useState, useEffect } from 'react'
import { Save, Send, Eye, EyeOff, Check } from 'lucide-react'

type Settings = Record<string, string>

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d)
      setLoading(false)
    })
  }, [])

  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }))

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const testTelegram = async () => {
    setTestSending(true)
    const res = await fetch('/api/telegram/send', { method: 'POST' })
    const data = await res.json()
    setTestSending(false)
    setTestResult(data.ok ? 'Testbesked sendt!' : `Fejl: ${data.error}`)
    setTimeout(() => setTestResult(null), 4000)
  }

  if (loading) return <div className="p-6 text-stone-400">Indlæser...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Indstillinger</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          {saved ? <Check size={15} /> : <Save size={15} />}
          {saved ? 'Gemt!' : saving ? 'Gemmer...' : 'Gem'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Family */}
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">👨‍👩‍👧‍👦 Familieprofil</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Antal voksne</label>
              <input
                type="number" min="1" max="10"
                value={settings.family_adults || '2'}
                onChange={e => set('family_adults', e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Antal børn</label>
              <input
                type="number" min="0" max="10"
                value={settings.family_children || '0'}
                onChange={e => set('family_children', e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Børnenes alder</label>
            <input
              value={settings.family_children_ages || ''}
              onChange={e => set('family_children_ages', e.target.value)}
              placeholder="fx 7, 9"
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Allergier / præferencer</label>
            <input
              value={settings.allergies || ''}
              onChange={e => set('allergies', e.target.value)}
              placeholder="fx Laktoseintolerant, ingen svinekød"
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Køkkentype</label>
            <select
              value={settings.kitchen_type || 'blandet'}
              onChange={e => set('kitchen_type', e.target.value)}
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="dansk">Dansk</option>
              <option value="internationalt">Internationalt</option>
              <option value="blandet">Blandet</option>
            </select>
          </div>
        </section>

        {/* AI */}
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">🤖 AI-indstillinger</h2>
          <div className="mb-3">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Mistral API-nøgle</label>
            <div className="relative mt-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.mistral_api_key || ''}
                onChange={e => set('mistral_api_key', e.target.value)}
                placeholder="..."
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
              />
              <button onClick={() => setShowKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Gratis nøgle: <span className="font-medium">console.mistral.ai</span> → API Keys. Virker i EU. Fotoanalyse bruger Pixtral-12B.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Mistral-model (AI-forslag)</label>
            <select
              value={settings.mistral_model || 'mistral-small-latest'}
              onChange={e => set('mistral_model', e.target.value)}
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="mistral-small-latest">mistral-small-latest (anbefalet, gratis)</option>
              <option value="open-mistral-nemo">open-mistral-nemo (gratis, lille)</option>
              <option value="mistral-medium-latest">mistral-medium-latest (betalt, bedre)</option>
              <option value="mistral-large-latest">mistral-large-latest (betalt, bedst)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Madpræferencer til AI</label>
            <textarea
              value={settings.ai_preferences || ''}
              onChange={e => set('ai_preferences', e.target.value)}
              rows={4}
              placeholder="Beskriv familiens madpræferencer, hvad I kan lide, hvad der virker godt..."
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>
        </section>

        {/* Unsplash */}
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">🖼️ Billedintegration</h2>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Unsplash API-nøgle (valgfrit)</label>
            <input
              type="password"
              value={settings.unsplash_access_key || ''}
              onChange={e => set('unsplash_access_key', e.target.value)}
              placeholder="Unsplash Access Key"
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <p className="text-xs text-stone-400 mt-1">Tilføj madbilleder automatisk til AI-forslag. Opret en gratis konto på unsplash.com/developers</p>
          </div>
        </section>

        {/* Telegram */}
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">📱 Telegram</h2>
          <div className="mb-3">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Bot-token</label>
            <input
              type="password"
              value={settings.telegram_bot_token || ''}
              onChange={e => set('telegram_bot_token', e.target.value)}
              placeholder="123456789:ABCdef..."
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Chat-ID</label>
            <input
              value={settings.telegram_chat_id || ''}
              onChange={e => set('telegram_chat_id', e.target.value)}
              placeholder="-100xxxxxxxxxx"
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Sendetidspunkt søndag</label>
            <input
              type="time"
              value={settings.telegram_send_time || '09:00'}
              onChange={e => set('telegram_send_time', e.target.value)}
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          {testResult && (
            <div className={`mb-3 px-3 py-2.5 rounded-xl text-sm ${testResult.includes('Fejl') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {testResult}
            </div>
          )}
          <button
            onClick={testTelegram}
            disabled={testSending}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#0088cc] text-[#0088cc] rounded-xl text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            <Send size={14} />
            {testSending ? 'Sender...' : 'Send testbesked nu'}
          </button>
          <p className="text-xs text-stone-400 mt-2">
            Opret en bot via @BotFather. Find chat-ID ved at tilføje botten til gruppen og skrive en besked, derefter besøg: https://api.telegram.org/bot[TOKEN]/getUpdates
          </p>
        </section>

        {/* Permanent shopping items */}
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">🛒 Faste indkøbsvarer</h2>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Varer (én per linje)</label>
            <textarea
              value={settings.permanent_shopping_items || ''}
              onChange={e => set('permanent_shopping_items', e.target.value)}
              rows={5}
              placeholder="Mælk&#10;Æg&#10;Brød"
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
            <p className="text-xs text-stone-400 mt-1">Disse varer tilføjes automatisk til ugentlige indkøbslister</p>
          </div>
        </section>
      </div>

      <div className="mt-6 pb-8">
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Gemt!' : saving ? 'Gemmer...' : 'Gem alle indstillinger'}
        </button>
      </div>
    </div>
  )
}
