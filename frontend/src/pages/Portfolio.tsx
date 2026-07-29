import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, X } from 'lucide-react'
import { usePortfolio } from '@/hooks/useCatalog'
import type { PortfolioItemResponse } from '@/types'

const CATEGORIES = ['All', 'Bride', 'Reception', 'Engagement', 'Baby Shower', 'Party', 'HD Makeup', 'Airbrush']

export default function Portfolio() {
  const { items, loading, refresh } = usePortfolio()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || 'All'
  const [selected, setSelected] = useState<PortfolioItemResponse | null>(null)

  useEffect(() => {
    refresh(activeCategory === 'All' ? undefined : activeCategory)
  }, [activeCategory, refresh])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-900">Portfolio</h1>
        <p className="text-sm text-brand-800/60 mt-0.5">A glimpse into our transformations.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSearchParams(cat === 'All' ? {} : { category: cat })}
            aria-current={activeCategory === cat ? 'true' : undefined}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeCategory === cat ? 'bg-brand-500 text-white' : 'bg-white border border-brand-200 text-brand-800/70'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-brand-800/50 py-16">No portfolio images in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              aria-label={`View ${item.caption || item.category} photo`}
              className="rounded-2xl overflow-hidden aspect-square group"
            >
              <img
                src={item.image_url}
                alt={item.caption || item.category}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selected.caption || selected.category}
        >
          <button
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelected(null)}
            aria-label="Close preview"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={selected.image_url}
            alt={selected.caption || selected.category}
            loading="lazy"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {selected.caption && (
            <p className="absolute bottom-6 text-white text-sm bg-black/50 rounded-full px-4 py-1.5">
              {selected.caption}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
