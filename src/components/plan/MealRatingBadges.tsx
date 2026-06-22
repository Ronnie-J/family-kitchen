'use client'

const TAG_LABELS: Record<string, string> = {
  børnevenlig: '👶 Børnevenlig',
  hurtig: '⚡ Under 30 min',
  søndagsret: '☀️ Søndagsret',
  vegetarisk: '🌱 Vegetarisk',
  festret: '🎉 Festret',
  ikke_igen: '🚫 Ikke igen',
}

type Props = {
  avgRating: number | null
  ratingCount: number | null
  tags: string | null
}

export default function MealRatingBadges({ avgRating, ratingCount, tags }: Props) {
  if (!avgRating && !tags) return null

  const stars = Math.round(avgRating ?? 0)
  const tagList = tags ? tags.split(',').filter(t => t && TAG_LABELS[t]) : []

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {avgRating && avgRating > 0 ? (
        <span className="flex items-center gap-1 text-xs bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
          {'★'.repeat(stars)}{'☆'.repeat(5 - stars)} {avgRating.toFixed(1)}
          {ratingCount && ratingCount > 0 ? <span className="text-amber-400 font-normal">({ratingCount})</span> : null}
        </span>
      ) : null}
      {tagList.map(tag => (
        <span
          key={tag}
          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
            tag === 'ikke_igen'
              ? 'bg-red-50 border-red-100 text-red-600'
              : 'bg-stone-50 border-stone-100 text-stone-600'
          }`}
        >
          {TAG_LABELS[tag]}
        </span>
      ))}
    </div>
  )
}
