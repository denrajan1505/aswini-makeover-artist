import { useNavigate, Link } from 'react-router-dom'
import { LogOut, Phone, Mail, Instagram, Star, MessageCircle, CalendarClock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '917708566191'

export default function Profile() {
  const { user, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl font-bold text-brand-900">Profile</h1>

      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-brand-700">
          {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-brand-900 text-lg">{user?.user_metadata?.full_name || 'User'}</p>
            {isAdmin && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold rounded-full px-2.5 py-0.5">
                Admin
              </span>
            )}
          </div>
          <p className="text-sm text-brand-800/60">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/my-bookings" className="card !p-4 flex flex-col items-center gap-2 text-center">
          <CalendarClock className="w-6 h-6 text-brand-500" />
          <span className="text-sm font-semibold text-brand-900">My Bookings</span>
        </Link>
        <Link to="/reviews" className="card !p-4 flex flex-col items-center gap-2 text-center">
          <Star className="w-6 h-6 text-gold-500" />
          <span className="text-sm font-semibold text-brand-900">Reviews</span>
        </Link>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-brand-900">Contact Us</h2>
        <a href="tel:+917708566191" className="flex items-center gap-3 text-sm text-brand-800/70">
          <Phone className="w-4 h-4 text-brand-500" /> +91 77085 66191
        </a>
        <a href="mailto:aswinisaleena@gmail.com" className="flex items-center gap-3 text-sm text-brand-800/70">
          <Mail className="w-4 h-4 text-brand-500" /> aswinisaleena@gmail.com
        </a>
        <a
          href="https://instagram.com/aswini_makover_artist"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-sm text-brand-800/70"
        >
          <Instagram className="w-4 h-4 text-brand-500" /> @aswini_makover_artist
        </a>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 mt-2"
        >
          <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
        </a>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-red-100 text-red-500 hover:bg-red-50 font-semibold text-sm transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  )
}
