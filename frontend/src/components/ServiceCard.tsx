import { Link } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import type { ServiceResponse } from '@/types'

export default function ServiceCard({ service }: { service: ServiceResponse }) {
  return (
    <div className="card flex flex-col overflow-hidden !p-0">
      <div className="h-36 bg-gradient-to-br from-brand-200 to-gold-200 flex items-center justify-center">
        {service.image_url ? (
          <img src={service.image_url} alt={service.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="font-serif text-3xl text-white/80">✨</span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-brand-900">{service.name}</h3>
          <span className="text-xs bg-brand-100 text-brand-700 font-semibold rounded-full px-2.5 py-1 whitespace-nowrap">
            {service.category}
          </span>
        </div>
        <p className="text-sm text-brand-800/60 mt-1.5 line-clamp-2 flex-1">{service.description}</p>
        <div className="flex items-center gap-1.5 text-xs text-brand-800/50 mt-3">
          <Clock className="w-3.5 h-3.5" />
          {service.duration_minutes} mins
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-lg font-bold text-gold-500">₹{service.price.toLocaleString('en-IN')}</span>
          <Link to={`/services/${service.slug}`} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
