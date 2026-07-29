import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Loader2, Clock, CheckCircle2, Lightbulb, CalendarCheck, ChevronLeft, HelpCircle } from 'lucide-react'
import { getService } from '@/lib/api'
import type { ServiceResponse } from '@/types'

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [service, setService] = useState<ServiceResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getService(slug)
      .then(({ data }) => setService(data))
      .catch(() => setService(null))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!service) {
    return <p className="text-center text-brand-800/50 py-16">Service not found.</p>
  }

  const gallery = service.gallery_urls?.length ? service.gallery_urls : service.image_url ? [service.image_url] : []

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-brand-600 font-medium">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {gallery.slice(0, 4).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${service.name} — photo ${i + 1}`}
              loading="lazy"
              className={`rounded-2xl object-cover h-40 w-full ${i === 0 ? 'col-span-2 h-56' : ''}`}
            />
          ))}
        </div>
      ) : (
        <div className="h-48 rounded-3xl bg-gradient-to-br from-brand-200 to-gold-200 flex items-center justify-center">
          <span className="font-serif text-4xl text-white/80">✨</span>
        </div>
      )}

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs bg-brand-100 text-brand-700 font-semibold rounded-full px-2.5 py-1">
              {service.category}
            </span>
            <h1 className="font-serif text-2xl font-bold text-brand-900 mt-2">{service.name}</h1>
          </div>
          <span className="text-2xl font-bold text-gold-500 whitespace-nowrap">
            ₹{service.price.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-brand-800/50 mt-2">
          <Clock className="w-4 h-4" /> {service.duration_minutes} mins
        </div>
        <p className="text-sm text-brand-800/70 mt-4">{service.description}</p>
      </div>

      {!!service.whats_included?.length && (
        <div className="card">
          <h2 className="font-semibold text-brand-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-500" /> What's Included
          </h2>
          <ul className="space-y-2">
            {service.whats_included.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brand-800/70">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400 mt-1.5 flex-shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!service.preparation_tips?.length && (
        <div className="card">
          <h2 className="font-semibold text-brand-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-gold-500" /> Preparation Tips
          </h2>
          <ul className="space-y-2">
            {service.preparation_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brand-800/70">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!service.faq?.length && (
        <div className="card">
          <h2 className="font-semibold text-brand-900 mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-500" /> FAQ
          </h2>
          <div className="space-y-3">
            {service.faq.map((f, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-brand-900">{f.question}</p>
                <p className="text-sm text-brand-800/60 mt-0.5">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to={`/book?service=${service.slug}`}
        className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3"
      >
        <CalendarCheck className="w-5 h-5" />
        Book Now
      </Link>
    </div>
  )
}
