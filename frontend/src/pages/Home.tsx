import { useEffect, useState, type CSSProperties, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Sparkles as ServicesIcon, Images, Gift, Star, Quote } from 'lucide-react'
import { useServices, useReviewsSummary } from '@/hooks/useCatalog'
import ServiceCard from '@/components/ServiceCard'
import { getReviews } from '@/lib/api'
import type { ReviewResponse } from '@/types'

interface QuickLink {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  color: string
}

const QUICK_LINKS: QuickLink[] = [
  { to: '/book', label: 'Book Appointment', icon: CalendarCheck, color: 'from-brand-400 to-brand-500' },
  { to: '/services', label: 'View Services', icon: ServicesIcon, color: 'from-gold-400 to-gold-500' },
  { to: '/services?category=Bridal', label: 'Bridal Packages', icon: Gift, color: 'from-brand-500 to-gold-400' },
  { to: '/portfolio', label: 'Gallery', icon: Images, color: 'from-gold-500 to-brand-400' },
]

export default function Home() {
  const { services, refresh } = useServices()
  const { summary, refresh: refreshSummary } = useReviewsSummary()
  const [reviews, setReviews] = useState<ReviewResponse[]>([])

  useEffect(() => {
    refresh()
    refreshSummary()
    getReviews()
      .then(({ data }) => setReviews(data.slice(0, 3)))
      .catch(() => {})
  }, [refresh, refreshSummary])

  const featured = services.slice(0, 3)

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="card !p-8 text-center bg-gradient-to-br from-brand-400 via-brand-500 to-gold-400 text-white border-0 relative overflow-hidden">
        <Sparkle className="absolute top-4 left-6 w-5 h-5 text-white/60" />
        {/* Static Tailwind classes can't stagger a per-instance animation-delay, so an inline style is unavoidable here. */}
        <Sparkle className="absolute bottom-6 right-10 w-4 h-4 text-white/50" style={{ animationDelay: '0.4s' }} />
        <p className="uppercase tracking-widest text-xs font-semibold text-white/80 mb-2">Aswini Makeover Artist</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">Enhance • Empower • Transform</h1>
        <p className="text-white/90 text-sm max-w-md mx-auto">
          Bridal, party, engagement &amp; HD makeup — crafted to make every moment unforgettable.
        </p>
        {summary && summary.total_reviews > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-4 py-1.5 mt-4 text-sm font-semibold">
            <Star className="w-4 h-4 fill-white text-white" />
            {summary.average_rating} ({summary.total_reviews} reviews)
          </div>
        )}
        <div className="mt-5">
          <Link
            to="/book"
            className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <CalendarCheck className="w-5 h-5" />
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map(({ to, label, icon: Icon, color }) => (
          <Link
            key={label}
            to={to}
            className="card !p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-all"
          >
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-brand-900">{label}</span>
          </Link>
        ))}
      </div>

      {/* Featured services */}
      {featured.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl font-bold text-brand-900">Popular Services</h2>
            <Link to="/services" className="text-sm text-brand-600 font-semibold hover:text-brand-700">
              View all
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <div>
          <h2 className="font-serif text-xl font-bold text-brand-900 mb-3">What Our Clients Say</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="card">
                <Quote className="w-5 h-5 text-gold-400 mb-2" />
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-gold-400 text-gold-400' : 'text-brand-100'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-brand-800/70 line-clamp-4">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Sparkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`animate-sparkle ${className ?? ''}`} style={style}>
      <ServicesIcon className="w-full h-full" />
    </span>
  )
}
