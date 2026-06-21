'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Check, X, ChevronRight, ChevronLeft, Clock, Utensils } from 'lucide-react'
import type { WeeklyPlanEntry } from '@/lib/db'
import RatingModal from '@/components/meals/RatingModal'

const DAY_NAMES = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']
const DAY_SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

type Suggestion = {
  name: string
  description: string
  prep_time: number
  ingredients: string[]
  image_url: string | null
  uses_inventory: boolean
}

function getWeekStart(offsetWeeks = 0) {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff + offsetWeeks * 7)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

function getWeekNumber(weekStart: string) {
  const [y, m, day] = weekStart.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1)
  return Math.floor((d.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1
}

function formatDate(weekStart: string, dayIdx: number) {
  const [y, m, day] = weekStart.split('-').map(Number)
  const d = new Date(y, m - 1, day) // lokal dato, ikke UTC-parsing
  d.setDate(d.getDate() + dayIdx)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function PlanPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getWeekStart(weekOffset)
  const currentWeekStart = getWeekStart(0)
  const isCurrentWeek = weekOffset === 0
  const [plan, setPlan] = useState<WeeklyPlanEntry[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [suggesting, setSuggesting] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [excludedDays, setExcludedDays] = useState<Record<number, 'eaten_out' | 'no_cooking' | null>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [ratingMeal, setRatingMeal] = useState<{ id: number; name: string } | null>(null)
  const [activeDay, setActiveDay] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/plan?week=${weekStart}`)
    const data = await res.json()
    setPlan(data.plan)
    setLoading(false)
  }

  useEffect(() => { load() }, [weekStart])

  const getPlanEntry = (day: number) => plan.find(p => p.day_of_week === day)

  const setDayStatus = async (day: number, status: 'eaten_out' | 'no_cooking' | null) => {
    if (status === null) {
      await fetch('/api/plan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, day_of_week: day }),
      })
    } else {
      await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, day_of_week: day, status }),
      })
    }
    setExcludedDays(p => ({ ...p, [day]: status }))
    load()
  }

  const handleGetSuggestions = async () => {
    const activeDays = selectedDays.filter(d => !excludedDays[d])
    if (activeDays.length === 0) return
    setSuggesting(true)
    setShowSuggestions(true)
    const res = await fetch('/api/plan/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: activeDays.length }),
    })
    const data = await res.json()
    setSuggesting(false)
    if (data.suggestions) setSuggestions(data.suggestions)
    else alert(data.error || 'Fejl ved AI-forslag')
  }

  const acceptSuggestion = async (dayIdx: number, suggestion: Suggestion) => {
    await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_start: weekStart,
        day_of_week: dayIdx,
        meal_name: suggestion.name,
        meal_description: suggestion.description,
        meal_ingredients: suggestion.ingredients,
        meal_prep_time: suggestion.prep_time,
        meal_image_url: suggestion.image_url,
        status: 'planned',
      }),
    })
    load()
  }

  const markAsDone = async (entry: WeeklyPlanEntry) => {
    await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, day_of_week: entry.day_of_week, status: 'done' }),
    })
    if (entry.meal_id) {
      setRatingMeal({ id: entry.meal_id, name: entry.meal_name || '' })
    } else if (entry.meal_name) {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: entry.meal_name, description: entry.meal_description, prep_time: entry.meal_prep_time, ingredients: JSON.parse(entry.meal_ingredients || '[]') }),
      })
      const meal = await res.json()
      setRatingMeal({ id: meal.id, name: meal.name })
    }
    load()
  }

  const activeDaysCount = selectedDays.filter(d => !excludedDays[d] && !getPlanEntry(d)?.meal_name).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-stone-800">Ugeplaner</h1>
        <button
          onClick={handleGetSuggestions}
          disabled={suggesting || activeDaysCount === 0}
          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <Sparkles size={15} />
          {suggesting ? 'Henter...' : `AI-forslag (${activeDaysCount})`}
        </button>
      </div>

      {/* Uge-navigation */}
      <div className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3 mb-4">
        <button
          onClick={() => { setWeekOffset(o => o - 1); setSuggestions([]); setShowSuggestions(false) }}
          disabled={weekOffset <= -2}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <div className="font-semibold text-stone-800 text-sm">
            Uge {getWeekNumber(weekStart)} · {formatDate(weekStart, 0)} – {formatDate(weekStart, 6)}
          </div>
          <div className="text-xs mt-0.5">
            {weekOffset === 0 && <span className="text-orange-500 font-medium">Denne uge</span>}
            {weekOffset === 1 && <span className="text-blue-500 font-medium">Næste uge</span>}
            {weekOffset === 2 && <span className="text-stone-400">Om 2 uger</span>}
            {weekOffset === -1 && <span className="text-stone-400">Forrige uge</span>}
            {weekOffset === -2 && <span className="text-stone-400">For 2 uger siden</span>}
          </div>
        </div>

        <button
          onClick={() => { setWeekOffset(o => o + 1); setSuggestions([]); setShowSuggestions(false) }}
          disabled={weekOffset >= 2}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Week calendar */}
      <div className="space-y-3 mb-6">
        {Array.from({ length: 7 }, (_, i) => i).map(dayIdx => {
          const entry = getPlanEntry(dayIdx)
          const excluded = excludedDays[dayIdx] ?? entry?.status
          const isToday = isCurrentWeek && new Date().getDay() === (dayIdx === 6 ? 0 : dayIdx + 1)
          const suggestion = suggestions[selectedDays.filter(d => !excludedDays[d]).indexOf(dayIdx)]

          return (
            <div
              key={dayIdx}
              className={`bg-white rounded-xl border ${isToday ? 'border-orange-300 ring-1 ring-orange-200' : 'border-stone-100'} overflow-hidden`}
            >
              <div className="flex items-center px-4 py-3">
                <div className="w-20 shrink-0">
                  <div className={`font-semibold text-sm ${isToday ? 'text-orange-500' : 'text-stone-700'}`}>{DAY_NAMES[dayIdx]}</div>
                  <div className="text-xs text-stone-400">{formatDate(weekStart, dayIdx)}</div>
                </div>

                <div className="flex-1 min-w-0 px-2">
                  {excluded === 'eaten_out' ? (
                    <span className="text-sm text-stone-500">🍕 Spiser ude</span>
                  ) : excluded === 'no_cooking' ? (
                    <span className="text-sm text-stone-500">✋ Ingen madlavning</span>
                  ) : entry?.meal_name ? (
                    <div>
                      <div className="font-medium text-stone-800 text-sm truncate">{entry.meal_name}</div>
                      {entry.meal_prep_time && (
                        <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                          <Clock size={11} /> {entry.meal_prep_time} min
                        </div>
                      )}
                    </div>
                  ) : suggestion && !excluded ? (
                    <div>
                      <div className="text-xs text-orange-500 font-medium mb-0.5">AI-forslag</div>
                      <div className="font-medium text-stone-800 text-sm truncate">{suggestion.name}</div>
                      {suggestion.prep_time && (
                        <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                          <Clock size={11} /> {suggestion.prep_time} min
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-stone-400">Ikke planlagt</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {entry?.status === 'done' ? (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-medium">Lavet</span>
                  ) : entry?.meal_name && entry.status === 'planned' ? (
                    <button
                      onClick={() => markAsDone(entry)}
                      className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"
                      title="Marker som lavet"
                    >
                      <Check size={16} />
                    </button>
                  ) : suggestion && !excluded ? (
                    <button
                      onClick={() => acceptSuggestion(dayIdx, suggestion)}
                      className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1.5 rounded-lg font-medium hover:bg-orange-100 transition-colors"
                    >
                      Vælg
                    </button>
                  ) : null}

                  <button
                    onClick={() => setActiveDay(activeDay === dayIdx ? null : dayIdx)}
                    className="p-1.5 text-stone-400 hover:bg-stone-50 rounded-lg"
                  >
                    <ChevronRight size={15} className={`transition-transform ${activeDay === dayIdx ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Expanded panel */}
              {activeDay === dayIdx && (() => {
                const activeMeal = entry?.meal_name ? entry : suggestion ? {
                  meal_name: suggestion.name,
                  meal_description: suggestion.description,
                  meal_ingredients: JSON.stringify(suggestion.ingredients),
                  meal_prep_time: suggestion.prep_time,
                  meal_image_url: suggestion.image_url,
                } : null

                const ingredients: string[] = (() => {
                  try { return JSON.parse(activeMeal?.meal_ingredients || '[]') } catch { return [] }
                })()

                return (
                  <div className="border-t border-stone-100">
                    {/* Handlingsknapper øverst */}
                    <div className="px-4 py-3 bg-stone-50 flex flex-wrap gap-2 border-b border-stone-100">
                      <button
                        onClick={() => { setDayStatus(dayIdx, null); setActiveDay(null) }}
                        className="text-xs bg-white border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors font-medium"
                      >
                        <Utensils size={11} className="inline mr-1" /> Planlæg ret
                      </button>
                      <button
                        onClick={() => { setDayStatus(dayIdx, 'eaten_out'); setActiveDay(null) }}
                        className="text-xs bg-white border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        🍕 Spiser ude
                      </button>
                      <button
                        onClick={() => { setDayStatus(dayIdx, 'no_cooking'); setActiveDay(null) }}
                        className="text-xs bg-white border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        ✋ Ingen madlavning
                      </button>
                      {(entry || excludedDays[dayIdx]) && (
                        <button
                          onClick={() => { setDayStatus(dayIdx, null); setActiveDay(null) }}
                          className="text-xs text-red-500 bg-white border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X size={11} className="inline mr-1" /> Ryd dag
                        </button>
                      )}
                    </div>

                    {/* Opskrift + billede */}
                    {activeMeal && (
                      <div className="px-4 py-4 space-y-3">
                        {/* Billede */}
                        {activeMeal.meal_image_url && (
                          <a
                            href={activeMeal.meal_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={activeMeal.meal_image_url}
                              alt={activeMeal.meal_name ?? ''}
                              className="w-full h-40 object-cover rounded-xl hover:opacity-90 transition-opacity"
                            />
                          </a>
                        )}

                        {/* Beskrivelse */}
                        {activeMeal.meal_description && (
                          <p className="text-sm text-stone-600 leading-relaxed">{activeMeal.meal_description}</p>
                        )}

                        {/* Ingredienser */}
                        {ingredients.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Ingredienser</div>
                            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {ingredients.map((ing, i) => (
                                <li key={i} className="text-sm text-stone-700 flex items-start gap-1.5">
                                  <span className="text-orange-400 mt-0.5 shrink-0">·</span>
                                  {ing}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Ekstern opskriftslink */}
                        {activeMeal.meal_name && (
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(activeMeal.meal_name + ' opskrift')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-orange-500 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Søg opskrift på Google
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* Suggestion details panel */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h2 className="font-semibold text-stone-700">AI-forslag til ugen</h2>
            <button onClick={() => { setShowSuggestions(false); setSuggestions([]) }} className="p-1 hover:bg-stone-100 rounded-lg">
              <X size={16} />
            </button>
          </div>
          <div className="divide-y divide-stone-100">
            {suggestions.map((s, i) => {
              const targetDay = selectedDays.filter(d => !excludedDays[d])[i]
              return (
                <div key={i} className="p-4 flex gap-3">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 text-2xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stone-800">{s.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5 line-clamp-2">{s.description}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {s.prep_time && <span className="text-xs text-stone-400"><Clock size={10} className="inline mr-0.5" />{s.prep_time} min</span>}
                      {s.uses_inventory && <span className="text-xs text-green-600 font-medium">✓ Bruger lager</span>}
                    </div>
                    {s.ingredients.length > 0 && (
                      <div className="text-xs text-stone-400 mt-1 truncate">{s.ingredients.slice(0, 4).join(', ')}{s.ingredients.length > 4 ? '...' : ''}</div>
                    )}
                  </div>
                  <button
                    onClick={() => acceptSuggestion(targetDay, s)}
                    className="shrink-0 text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-100 self-start"
                  >
                    Vælg til {DAY_SHORT[targetDay]}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t border-stone-100">
            <button onClick={handleGetSuggestions} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
              <RefreshCw size={14} /> Hent nye forslag
            </button>
          </div>
        </div>
      )}

      {ratingMeal && (
        <RatingModal
          mealId={ratingMeal.id}
          mealName={ratingMeal.name}
          onClose={() => setRatingMeal(null)}
          onSaved={() => { setRatingMeal(null); load() }}
        />
      )}
    </div>
  )
}
