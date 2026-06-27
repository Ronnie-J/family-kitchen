import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function getWeekStart(offsetWeeks = 0) {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff + offsetWeeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekNumber(weekStart: string) {
  const [y, m, day] = weekStart.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1)
  return Math.floor((d.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1
}

export async function GET() {
  const db = getDb()

  // --- Ugeplaner: de seneste 4 uger ---
  const weeklyHistory = Array.from({ length: 4 }, (_, i) => {
    const weekStart = getWeekStart(-i)
    const entries = db.prepare(`SELECT status, is_leftover FROM weekly_plan WHERE week_start = ?`).all(weekStart) as
      { status: string; is_leftover: number }[]

    const planned = entries.filter(e => e.status !== 'eaten_out' && e.status !== 'no_cooking').length
    const done = entries.filter(e => e.status === 'done').length
    const eatenOut = entries.filter(e => e.status === 'eaten_out').length
    const noCooking = entries.filter(e => e.status === 'no_cooking').length
    const leftovers = entries.filter(e => e.is_leftover === 1 && e.status === 'done').length

    return { weekStart, weekNumber: getWeekNumber(weekStart), planned, done, eatenOut, noCooking, leftovers, total: entries.length }
  })

  const thisWeek = weeklyHistory[0]

  // --- Lager-alder ---
  const now = new Date()
  const inventoryItems = db.prepare(`
    SELECT name, location, added_at FROM inventory_items
    WHERE removed_at IS NULL ORDER BY added_at ASC
  `).all() as { name: string; location: string; added_at: string }[]

  const inventoryAge = inventoryItems.map(item => {
    const added = new Date(item.added_at)
    const daysOld = Math.floor((now.getTime() - added.getTime()) / 86400000)
    return { ...item, daysOld }
  })

  const inventoryStats = {
    total: inventoryAge.length,
    fresh: inventoryAge.filter(i => i.daysOld < 7).length,
    aging: inventoryAge.filter(i => i.daysOld >= 7 && i.daysOld < 30).length,
    old: inventoryAge.filter(i => i.daysOld >= 30).length,
    oldestItems: inventoryAge.slice(0, 5).map(i => ({ name: i.name, location: i.location, daysOld: i.daysOld })),
  }

  // --- Varer brugt (fjernet) seneste 30 dage ---
  const usedCount = (db.prepare(`
    SELECT COUNT(*) as cnt FROM inventory_items
    WHERE removed_at >= datetime('now', '-30 days', 'localtime')
  `).get() as { cnt: number }).cnt

  // --- Bedømmelser ---
  const recentRatings = db.prepare(`
    SELECT stars FROM meal_ratings ORDER BY rated_at DESC LIMIT 10
  `).all() as { stars: number }[]

  const avgRecent = recentRatings.slice(0, 5).length
    ? recentRatings.slice(0, 5).reduce((s, r) => s + r.stars, 0) / recentRatings.slice(0, 5).length
    : null

  const avgOlder = recentRatings.slice(5, 10).length
    ? recentRatings.slice(5, 10).reduce((s, r) => s + r.stars, 0) / recentRatings.slice(5, 10).length
    : null

  const ratingTrend: 'up' | 'down' | 'stable' =
    avgRecent && avgOlder
      ? avgRecent > avgOlder + 0.3 ? 'up' : avgRecent < avgOlder - 0.3 ? 'down' : 'stable'
      : 'stable'

  // --- Favoritter lavet (seneste 30 dage) ---
  const favMadeCount = (db.prepare(`
    SELECT COUNT(*) as cnt FROM meal_history mh
    JOIN meals m ON mh.meal_id = m.id
    WHERE m.is_favorite = 1 AND mh.made_at >= datetime('now', '-30 days', 'localtime')
  `).get() as { cnt: number }).cnt

  // --- Streak: uger i træk med mindst 4 kogte retter ---
  let streak = 0
  for (const week of weeklyHistory) {
    if (week.done >= 4) streak++
    else break
  }

  // --- Achievements ---
  const achievements: { id: string; label: string; description: string; emoji: string }[] = []

  if (thisWeek.done >= 5)
    achievements.push({ id: 'ugechef', emoji: '👨‍🍳', label: 'Ugechef', description: `${thisWeek.done} retter lavet denne uge` })

  if (thisWeek.leftovers >= 1)
    achievements.push({ id: 'restermester', emoji: '♻️', label: 'Restermester', description: 'Rester anvendt denne uge' })

  if (streak >= 2)
    achievements.push({ id: 'streak', emoji: '🔥', label: `${streak} ugers streak`, description: 'Mindst 4 kogte retter i træk' })

  if (avgRecent && avgRecent >= 4.5)
    achievements.push({ id: 'gourmet', emoji: '⭐', label: 'Gourmet', description: `Gennemsnit ${avgRecent.toFixed(1)} på seneste 5 retter` })

  if (favMadeCount >= 2)
    achievements.push({ id: 'favoritter', emoji: '❤️', label: 'Familiefavoritter', description: `${favMadeCount} favoritter lavet seneste 30 dage` })

  if (usedCount >= 3 && inventoryStats.total > 0)
    achievements.push({ id: 'frysebuster', emoji: '🧊', label: 'Lagermester', description: `${usedCount} varer brugt fra lager seneste 30 dage` })

  if (inventoryStats.old === 0 && inventoryStats.total > 0)
    achievements.push({ id: 'freshkeeper', emoji: '🌿', label: 'Intet spild', description: 'Ingen varer ældre end 30 dage på lager' })

  return NextResponse.json({
    thisWeek,
    weeklyHistory,
    inventoryStats,
    usedCount,
    ratings: { avg: avgRecent, trend: ratingTrend, count: recentRatings.length },
    favMadeCount,
    streak,
    achievements,
  })
}
