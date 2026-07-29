import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useServices } from '@/hooks/useCatalog'
import ServiceCard from '@/components/ServiceCard'

const CATEGORIES = ['All', 'Party', 'Engagement', 'Bridal', 'Reception', 'Baby Shower', 'Mature Skin', 'Add-on']

export default function Services() {
  const { services, loading, refresh } = useServices()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || 'All'

  useEffect(() => {
    refresh(activeCategory === 'All' ? undefined : activeCategory)
  }, [activeCategory, refresh])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-900">Our Services</h1>
        <p className="text-sm text-brand-800/60 mt-0.5">Choose from our full range of makeup and styling services.</p>
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
      ) : services.length === 0 ? (
        <p className="text-center text-brand-800/50 py-16">No services found in this category.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  )
}
