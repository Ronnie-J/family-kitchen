'use client'

import { useState, useEffect } from 'react'

const DAY_NAMES = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

type WeekStats = {
  weekStart: string
  weekNumber: number
  planned: number
  done: number
  eatenOut: number
  noCooking: number
  leftovers: number
  total: number
}

type Stats = {
  thisWeek: WeekStats
  weeklyHistory: WeekStats[]
  inventoryStats: {
    total: number
    fresh: number
    aging: number
    old: number
    oldestItems: { name: string; location: string; daysOld: number }[]
  }
  usedCount: number
  ratings: { avg: number | null; trend: 'up' | 'down' | 'stable'; count: number }
  favMadeCount: number
  streak: number
  achievements: { id: string; label: string; description: string; emoji: string }[]
}

function CookingBar({ week, isCurrent }: { week: WeekStats; isCurrent: boolean }) {
  const total = 7
  const cookRate = total > 0 ? Math.round((week.done / total) * 100) : 0
  return (
    <div className={`rounded-xl p-3 ${isCurrent ? 'bg-orange-50 border border-orange-100' : 'bg-stone-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${isCurrent ? 'text-orange-600' : 'text-stone-500'}`}>
          Uge {week.weekNumber}{isCurrent ? ' · nu' : ''}
        </span>
        <span className="text-xs text-stone-500">{week.done}/7 dage</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 7 }, (_, i) => {
          const dayName = DAY_NAMES[i]
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={dayName}>
              <div className={`w-full rounded-sm h-5 ${
                i < week.done ? 'bg-orange-400' :
                i < week.done + week.eatenOut ? 'bg-stone-300' :
                i < week.done + week.eatenOut + week.noCooking ? 'bg-stone-200' :
                'bg-stone-100'
              }`} />
              <span className="text-[9px] text-stone-300">{dayName[0]}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
        {week.leftovers > 0 && <span>♻️ {week.leftovers} rester</span>}
        {week.eatenOut > 0 && <span>🍕 {week.eatenOut} ude</span>}
        {cookRate >= 70 && <span className="text-orange-500 font-medium">✓ God uge</span>}
      </div>
    </div>
  )
}

function InventoryAgeBar({ fresh, aging, old, total }: { fresh: number; aging: number; old: number; total: number }) {
  if (total === 0) return <p className="text-sm text-stone-400">Intet på lager</p>
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-3 mb-2">
        {fresh > 0 && <div className="bg-green-400 transition-all" style={{ width: `${(fresh / total) * 100}%` }} />}
        {aging > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${(aging / total) * 100}%` }} />}
        {old > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(old / total) * 100}%` }} />}
      </div>
      <div className="flex gap-4 text-xs text-stone-500">
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />{fresh} friske (&lt;1 uge)</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />{aging} modne (1–4 uger)</span>
        {old > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />{old} gamle (&gt;4 uger)</span>}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="h-8 bg-stone-100 rounded-xl w-40 mb-6 animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!stats) return null

  const { thisWeek, weeklyHistory, inventoryStats, usedCount, ratings, achievements, streak } = stats

  const cookRateThisWeek = Math.round((thisWeek.done / 7) * 100)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Statistik</h1>

      {/* Achievements */}
      {achievements.length > 0 && (
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-stone-800 mb-3">🏅 Opnåede badges</h2>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map(a => (
              <div key={a.id} className="flex items-start gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                <span className="text-xl shrink-0">{a.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-stone-800">{a.label}</div>
                  <div className="text-xs text-stone-500 leading-tight">{a.description}</div>
                </div>
              </div>
            ))}
          </div>
          {achievements.length === 0 && (
            <p className="text-sm text-stone-400">Lav mad, brug lager og bed din familie om at bedømme retterne — så optjener du badges her.</p>
          )}
        </section>
      )}

      {/* Denne uge */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <h2 className="font-semibold text-stone-800 mb-1">Denne uge</h2>
        <p className="text-xs text-stone-400 mb-4">Uge {thisWeek.weekNumber}</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">{thisWeek.done}</div>
            <div className="text-xs text-stone-500 mt-0.5">retter lavet</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-stone-700">{cookRateThisWeek}%</div>
            <div className="text-xs text-stone-500 mt-0.5">af ugen</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-500">{thisWeek.leftovers}</div>
            <div className="text-xs text-stone-500 mt-0.5">rester brugt</div>
          </div>
        </div>
        <CookingBar week={thisWeek} isCurrent={true} />
        {thisWeek.eatenOut > 0 && (
          <p className="text-xs text-stone-400 mt-2">{thisWeek.eatenOut} {thisWeek.eatenOut === 1 ? 'dag' : 'dage'} spist ude — det er helt normalt.</p>
        )}
        {cookRateThisWeek >= 70 && (
          <p className="text-sm text-orange-600 font-medium mt-3">Flot indsats denne uge! 👏</p>
        )}
      </section>

      {/* Seneste 4 uger */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <h2 className="font-semibold text-stone-800 mb-1">Seneste 4 uger</h2>
        {streak >= 2 && (
          <p className="text-xs text-orange-500 font-medium mb-3">🔥 {streak} ugers streak med 4+ retter</p>
        )}
        <div className="space-y-2">
          {weeklyHistory.map((week, i) => (
            <CookingBar key={week.weekStart} week={week} isCurrent={i === 0} />
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-stone-400">
          <span><span className="inline-block w-2 h-2 rounded-sm bg-orange-400 mr-1" />Lavet</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-stone-300 mr-1" />Spist ude</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-stone-200 mr-1" />Ingen madl.</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-stone-100 mr-1" />Ikke planlagt</span>
        </div>
      </section>

      {/* Lager */}
      <section className="bg-white rounded-2xl border border-stone-100 p-5">
        <h2 className="font-semibold text-stone-800 mb-1">Lagerudnyttelse</h2>
        <p className="text-xs text-stone-400 mb-4">{inventoryStats.total} varer på lager · {usedCount} fjernet seneste 30 dage</p>

        <InventoryAgeBar
          fresh={inventoryStats.fresh}
          aging={inventoryStats.aging}
          old={inventoryStats.old}
          total={inventoryStats.total}
        />

        {inventoryStats.old > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="text-xs font-semibold text-amber-700 mb-2">
              ⏰ {inventoryStats.old} {inventoryStats.old === 1 ? 'vare har' : 'varer har'} ligget over 30 dage
            </div>
            <ul className="space-y-1">
              {inventoryStats.oldestItems.filter(i => i.daysOld >= 30).map((item, i) => (
                <li key={i} className="text-xs text-amber-600 flex items-center justify-between">
                  <span>{item.name}</span>
                  <span className="text-amber-400">{item.location === 'freezer' ? '❄️' : '🥫'} {item.daysOld} dage</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-500 mt-2">Overvej at planlægge retter med disse varer.</p>
          </div>
        )}

        {inventoryStats.old === 0 && inventoryStats.total > 0 && (
          <p className="text-sm text-green-600 font-medium mt-3">🌿 Alle varer er under 30 dage — godt styr på lageret!</p>
        )}

        {usedCount > 0 && (
          <p className="text-xs text-stone-500 mt-3">
            Du har brugt {usedCount} {usedCount === 1 ? 'vare' : 'varer'} fra lager de seneste 30 dage.
            {usedCount >= 5 ? ' Rigtig god udnyttelse! 🎉' : ''}
          </p>
        )}
      </section>

      {/* Bedømmelser */}
      {ratings.count > 0 && (
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">Madkvalitet</h2>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500">{ratings.avg?.toFixed(1)}</div>
              <div className="text-xs text-stone-400 mt-0.5">gns. seneste 5</div>
            </div>
            <div>
              <div className="text-sm text-stone-600">
                {ratings.trend === 'up' && '📈 Stigende trend — retterne bliver bedre og bedre!'}
                {ratings.trend === 'down' && '📉 Faldende trend — prøv noget nyt eller juster opskrifterne.'}
                {ratings.trend === 'stable' && '📊 Stabil kvalitet over tid.'}
              </div>
              <div className="text-xs text-stone-400 mt-1">Baseret på {ratings.count} bedømmelser</div>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div
                key={n}
                className={`h-2 flex-1 rounded-full ${n <= Math.round(ratings.avg ?? 0) ? 'bg-amber-400' : 'bg-stone-100'}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ingen data endnu */}
      {thisWeek.total === 0 && achievements.length === 0 && (
        <section className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="font-semibold text-stone-700 mb-1">Ingen data endnu</div>
          <p className="text-sm text-stone-400">
            Begynd at planlægge og lave mad — så vises statistik og badges her.
          </p>
        </section>
      )}
    </div>
  )
}
