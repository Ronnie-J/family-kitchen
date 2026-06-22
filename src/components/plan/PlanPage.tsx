'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Check, X, ChevronRight, ChevronLeft, Clock, Utensils } from 'lucide-react'
import type { WeeklyPlanEntry } from '@/lib/db'
import RatingModal from '@/components/meals/RatingModal'
import InlineListEditor from '@/components/plan/InlineListEditor'
import AddMealForm from '@/components/plan/AddMealForm'
import MealRatingBadges from '@/components/plan/MealRatingBadges'

const DAY_NAMES = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']
const DAY_SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

type Suggestion = {
  name: string
  description: string
  prep_time: number
  ingredients: string[]
  recipe: string[]
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

type FavoriteMeal = {
  id: number
  name: string
  description: string | null
  prep_time: number | null
  ingredients: string
  recipe: string | null
  avg_rating: number
  rating_count: number
  image_url: string | null
  tags: string | null
}

export default function PlanPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getWeekStart(weekOffset)
  const currentWeekStart = getWeekStart(0)
  const isCurrentWeek = weekOffset === 0
  const [plan, setPlan] = useState<WeeklyPlanEntry[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [suggesting, setSuggesting] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [excludedDays, setExcludedDays] = useState<Record<number, 'eaten_out' | 'no_cooking' | null>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [ratingMeal, setRatingMeal] = useState<{ id: number; name: string } | null>(null)
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const [twoDaySuggestions, setTwoDaySuggestions] = useState<Set<number>>(new Set())
  const [scaling, setScaling] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const [planRes, favRes] = await Promise.all([
      fetch(`/api/plan?week=${weekStart}`),
      fetch('/api/meals?favorites=1'),
    ])
    const planData = await planRes.json()
    const favData = await favRes.json()
    setPlan(planData.plan)
    setFavorites(Array.isArray(favData) ? favData : [])
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
    if (activeDaysCount === 0) return
    setSuggesting(true)
    setShowSuggestions(true)
    const res = await fetch('/api/plan/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: Math.max(2, activeDaysCount) }),
    })
    const data = await res.json()
    setSuggesting(false)
    if (data.suggestions) setSuggestions(data.suggestions)
    else alert(data.error || 'Fejl ved AI-forslag')
  }

  const acceptSuggestion = async (dayIdx: number, suggestion: Suggestion, suggestionIdx: number) => {
    const isTwoDay = twoDaySuggestions.has(suggestionIdx)
    let ingredients = suggestion.ingredients

    if (isTwoDay) {
      setScaling(suggestionIdx)
      const res = await fetch('/api/plan/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: suggestion.name, ingredients: suggestion.ingredients }),
      })
      const data = await res.json()
      if (data.ingredients) ingredients = data.ingredients
      setScaling(null)
    }

    await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_start: weekStart,
        day_of_week: dayIdx,
        meal_name: suggestion.name,
        meal_description: suggestion.description + (isTwoDay ? ' — tilberedt til 2 dage' : ''),
        meal_ingredients: ingredients,
        meal_prep_time: suggestion.prep_time,
        meal_image_url: suggestion.image_url,
        meal_recipe: suggestion.recipe,
        status: 'planned',
      }),
    })

    if (isTwoDay && dayIdx < 6) {
      await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: weekStart,
          day_of_week: dayIdx + 1,
          meal_name: suggestion.name,
          meal_description: `Rester fra ${DAY_NAMES[dayIdx]}`,
          meal_ingredients: [],
          is_leftover: 1,
          status: 'planned',
        }),
      })
    }

    setSuggestions(prev => prev.filter((_, j) => j !== suggestionIdx))
    load()
  }

  const setLeftover = async (fromDayIdx: number, mealName: string) => {
    await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_start: weekStart,
        day_of_week: fromDayIdx + 1,
        meal_name: mealName,
        meal_description: `Rester fra ${DAY_NAMES[fromDayIdx]}`,
        meal_ingredients: [],
        is_leftover: 1,
        status: 'planned',
      }),
    })
    setActiveDay(null)
    load()
  }

  const planFavorite = async (dayIdx: number, fav: FavoriteMeal) => {
    const ingredients: string[] = (() => { try { return JSON.parse(fav.ingredients) } catch { return [] } })()
    const recipe: string[] = (() => { try { return JSON.parse(fav.recipe || '[]') } catch { return [] } })()
    await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_start: weekStart,
        day_of_week: dayIdx,
        meal_name: fav.name,
        meal_description: fav.description,
        meal_ingredients: ingredients,
        meal_recipe: recipe,
        meal_prep_time: fav.prep_time,
        meal_image_url: fav.image_url,
        status: 'planned',
      }),
    })
    load()
  }

  const savePlanField = async (entry: WeeklyPlanEntry, field: 'meal_ingredients' | 'meal_recipe', value: string[]) => {
    const ingredients = field === 'meal_ingredients' ? value : JSON.parse(entry.meal_ingredients || '[]')
    const recipe = field === 'meal_recipe' ? value : (() => { try { return JSON.parse(entry.meal_recipe || '[]') } catch { return [] } })()
    await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_start: weekStart,
        day_of_week: entry.day_of_week,
        meal_name: entry.meal_name,
        meal_description: entry.meal_description,
        meal_ingredients: ingredients,
        meal_recipe: recipe,
        meal_prep_time: entry.meal_prep_time,
        meal_image_url: entry.meal_image_url,
        status: entry.status,
        is_leftover: entry.is_leftover,
      }),
    })
    load()
  }

  const saveFavoriteField = async (id: number, field: 'ingredients' | 'recipe', value: string[]) => {
    await fetch(`/api/meals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    load()
  }

  const saveSuggestionField = (idx: number, field: 'ingredients' | 'recipe', value: string[]) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
    return Promise.resolve()
  }

  const removeFavorite = async (id: number) => {
    await fetch(`/api/meals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: false }),
    })
    load()
  }

  const markAsDone = async (entry: WeeklyPlanEntry) => {
    await fetch('/api/plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, day_of_week: entry.day_of_week, status: 'done' }),
    })
    if (entry.meal_id) {
      setRatingMeal({ id: entry.meal_id, name: entry.meal_name || '' })
    } else if (entry.meal_name) {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: entry.meal_name,
          description: entry.meal_description,
          prep_time: entry.meal_prep_time,
          ingredients: JSON.parse(entry.meal_ingredients || '[]'),
          recipe: (() => { try { return JSON.parse(entry.meal_recipe || '[]') } catch { return [] } })(),
          image_url: entry.meal_image_url,
        }),
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
                  ) : entry?.is_leftover ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full font-medium">🥘 Rester</span>
                        <span className="font-medium text-stone-700 text-sm truncate">{entry.meal_name}</span>
                      </div>
                      {entry.meal_description && (
                        <div className="text-xs text-stone-400 mt-0.5">{entry.meal_description}</div>
                      )}
                    </div>
                  ) : entry?.meal_name ? (
                    <div>
                      <div className="font-medium text-stone-800 text-sm truncate">{entry.meal_name}</div>
                      {entry.meal_prep_time && (
                        <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                          <Clock size={11} /> {entry.meal_prep_time} min
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
                const activeMeal = entry?.meal_name ? entry : null

                const ingredients: string[] = (() => {
                  try { return JSON.parse(activeMeal?.meal_ingredients || '[]') } catch { return [] }
                })()

                const recipeSteps: string[] = (() => {
                  try { return JSON.parse(activeMeal?.meal_recipe || '[]') } catch { return [] }
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

                        {/* Rating og badges */}
                        <MealRatingBadges
                          avgRating={activeMeal.meal_avg_rating}
                          ratingCount={activeMeal.meal_rating_count}
                          tags={activeMeal.meal_tags}
                        />

                        {/* Ingredienser */}
                        {(ingredients.length > 0 || !activeMeal.is_leftover) && (
                          <InlineListEditor
                            label="Ingredienser"
                            items={ingredients}
                            onSave={v => savePlanField(activeMeal, 'meal_ingredients', v)}
                          />
                        )}

                        {/* Fremgangsmåde */}
                        {(recipeSteps.length > 0 || !activeMeal.is_leftover) && (
                          <InlineListEditor
                            label="Fremgangsmåde"
                            items={recipeSteps}
                            ordered
                            onSave={v => savePlanField(activeMeal, 'meal_recipe', v)}
                          />
                        )}

                        {/* Ekstern opskriftslink */}
                        {activeMeal.meal_name && !entry?.is_leftover && (
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

                        {/* Rester til næste dag */}
                        {entry?.meal_name && !entry.is_leftover && dayIdx < 6 && (
                          <div className="pt-2 border-t border-stone-100">
                            {getPlanEntry(dayIdx + 1)?.is_leftover ? (
                              <div className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                                <span className="text-xs text-amber-700 font-medium">🥘 Rester planlagt til {DAY_NAMES[dayIdx + 1]}</span>
                                <button
                                  onClick={() => setDayStatus(dayIdx + 1, null)}
                                  className="text-amber-400 hover:text-red-500 ml-2"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : !getPlanEntry(dayIdx + 1)?.meal_name ? (
                              <button
                                onClick={() => setLeftover(dayIdx, entry.meal_name!)}
                                className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 bg-stone-50 hover:bg-amber-50 hover:text-amber-700 border border-stone-100 hover:border-amber-200 rounded-lg px-3 py-2 transition-colors"
                              >
                                🥘 Retter strækker sig — sæt rester til {DAY_NAMES[dayIdx + 1]}
                              </button>
                            ) : null}
                          </div>
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

      {/* Favoritter */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => { setShowFavorites(f => !f); setShowAddMeal(false) }}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <span className="text-base">⭐</span>
              <span className="font-semibold text-stone-700">Favoritter</span>
              {favorites.length > 0 && (
                <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">{favorites.length}</span>
              )}
              <ChevronRight size={15} className={`text-stone-400 transition-transform ${showFavorites ? 'rotate-90' : ''}`} />
            </button>
            <button
              onClick={() => { setShowAddMeal(a => !a); setShowFavorites(true) }}
              className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg font-medium hover:bg-orange-100 transition-colors"
            >
              + Opret opskrift
            </button>
          </div>

          {showAddMeal && (
            <AddMealForm
              onSaved={() => { setShowAddMeal(false); load() }}
              onCancel={() => setShowAddMeal(false)}
            />
          )}

          {showFavorites && (
            <div className="border-t border-stone-100 divide-y divide-stone-50">
              {favorites.map(fav => {
                const avgStars = Math.round(fav.avg_rating)
                const favIngredients: string[] = (() => { try { return JSON.parse(fav.ingredients) } catch { return [] } })()
                const favRecipe: string[] = (() => { try { return JSON.parse(fav.recipe || '[]') } catch { return [] } })()
                return (
                  <div key={fav.id} className="p-4">
                    <div className="flex gap-3">
                      {fav.image_url ? (
                        <a href={fav.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img src={fav.image_url} alt={fav.name} className="w-16 h-16 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 text-xl">🍽️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-stone-800 text-sm">{fav.name}</div>
                          <button
                            onClick={() => removeFavorite(fav.id)}
                            className="text-stone-300 hover:text-red-400 shrink-0 transition-colors"
                            title="Fjern fra favoritter"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {fav.prep_time && <span className="text-xs text-stone-400"><Clock size={10} className="inline mr-0.5" />{fav.prep_time} min</span>}
                        </div>
                        <div className="mt-1.5">
                          <MealRatingBadges
                            avgRating={fav.avg_rating}
                            ratingCount={fav.rating_count}
                            tags={fav.tags}
                          />
                        </div>
                        {fav.description && (
                          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{fav.description}</p>
                        )}
                      </div>
                    </div>

                    {favIngredients.length > 0 && (
                      <div className="mt-3">
                        <InlineListEditor
                          label="Ingredienser"
                          items={favIngredients}
                          onSave={v => saveFavoriteField(fav.id, 'ingredients', v)}
                        />
                      </div>
                    )}

                    {favRecipe.length > 0 && (
                      <div className="mt-3">
                        <InlineListEditor
                          label="Fremgangsmåde"
                          items={favRecipe}
                          ordered
                          onSave={v => saveFavoriteField(fav.id, 'recipe', v)}
                        />
                      </div>
                    )}


                    <div className="mt-3 pt-2.5 border-t border-stone-50">
                      <div className="text-xs text-stone-400 mb-1.5">Planlæg til dag:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {DAY_SHORT.map((label, dayIdx) => {
                          const dayEntry = getPlanEntry(dayIdx)
                          const isExcluded = !!(excludedDays[dayIdx] || dayEntry?.status === 'eaten_out' || dayEntry?.status === 'no_cooking')
                          const hasMeal = !!(dayEntry?.meal_name)
                          const isDisabled = isExcluded || hasMeal
                          return (
                            <button
                              key={dayIdx}
                              disabled={isDisabled}
                              onClick={() => planFavorite(dayIdx, fav)}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                                isDisabled
                                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                                  : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200'
                              }`}
                              title={isDisabled ? (hasMeal ? 'Dagen har allerede en ret' : 'Ekskluderet dag') : `Planlæg til ${DAY_NAMES[dayIdx]}`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
            {suggestions.map((s, i) => (
              <div key={i} className="p-4">
                <div className="flex gap-3">
                  {s.image_url ? (
                    <a href={s.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={s.image_url} alt={s.name} className="w-16 h-16 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                    </a>
                  ) : (
                    <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 text-2xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stone-800">{s.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{s.description}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {s.prep_time && <span className="text-xs text-stone-400"><Clock size={10} className="inline mr-0.5" />{s.prep_time} min</span>}
                      {s.uses_inventory && (
                        <span className="text-xs bg-green-50 text-green-600 border border-green-100 px-1.5 py-0.5 rounded-full font-medium">
                          ✓ Bruger lager
                        </span>
                      )}
                    </div>
                    {s.ingredients.length > 0 && (
                      <div className="mt-2">
                        <InlineListEditor
                          label="Ingredienser"
                          items={s.ingredients}
                          onSave={v => saveSuggestionField(i, 'ingredients', v)}
                        />
                      </div>
                    )}

                    {s.recipe && s.recipe.length > 0 && (
                      <div className="mt-3">
                        <InlineListEditor
                          label="Fremgangsmåde"
                          items={s.recipe}
                          ordered
                          onSave={v => saveSuggestionField(i, 'recipe', v)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2-dages toggle + dag-vælger */}
                <div className="mt-3 pt-3 border-t border-stone-50 space-y-2.5">
                  <button
                    onClick={() => setTwoDaySuggestions(prev => {
                      const next = new Set(prev)
                      next.has(i) ? next.delete(i) : next.add(i)
                      return next
                    })}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                      twoDaySuggestions.has(i)
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-amber-200 hover:text-amber-600'
                    }`}
                  >
                    🥘 {twoDaySuggestions.has(i) ? 'Strækker sig over 2 dage — ingredienser skaleres op' : 'Strækker sig over 2 dage?'}
                  </button>

                  <div>
                    <div className="text-xs text-stone-400 mb-1.5">
                      {scaling === i ? 'Skalerer ingredienser...' : 'Planlæg til dag:'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_SHORT.map((label, dayIdx) => {
                        const dayEntry = getPlanEntry(dayIdx)
                        const isExcluded = !!(excludedDays[dayIdx] || dayEntry?.status === 'eaten_out' || dayEntry?.status === 'no_cooking')
                        const hasMeal = !!(dayEntry?.meal_name)
                        const nextOccupied = twoDaySuggestions.has(i) && dayIdx < 6 && !!getPlanEntry(dayIdx + 1)?.meal_name
                        const isDisabled = isExcluded || hasMeal || scaling === i
                        return (
                          <button
                            key={dayIdx}
                            disabled={isDisabled}
                            onClick={() => acceptSuggestion(dayIdx, s, i)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                              isDisabled
                                ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                                : nextOccupied
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
                                  : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200'
                            }`}
                            title={
                              isDisabled ? (hasMeal ? 'Dag har allerede en ret' : 'Ekskluderet dag') :
                              nextOccupied ? `${DAY_NAMES[dayIdx + 1]} er optaget — rester overskrives ikke` :
                              twoDaySuggestions.has(i) ? `Planlæg til ${DAY_NAMES[dayIdx]} + rester ${DAY_NAMES[dayIdx + 1]}` :
                              `Tilføj til ${DAY_NAMES[dayIdx]}`
                            }
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    {twoDaySuggestions.has(i) && (
                      <div className="text-xs text-amber-600 mt-1.5">
                        Næste dag sættes automatisk som rester
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
