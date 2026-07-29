import { useState, type ComponentType } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Home, Sparkles as ServicesIcon, CalendarCheck, Images, User, LogOut, Shield } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/services', label: 'Services', icon: ServicesIcon },
  { to: '/book', label: 'Book', icon: CalendarCheck },
  { to: '/portfolio', label: 'Portfolio', icon: Images },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-brand-100 min-h-screen fixed left-0 top-0 z-30">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-brand-100">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-gold-400 rounded-lg flex items-center justify-center">
            <ServicesIcon className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif font-bold text-lg text-brand-900 leading-tight">
            Aswini
            <br />
            Makeover Artist
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-brand-800/70 hover:bg-brand-50 hover:text-brand-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-brand-800/40'}`} />
                {label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              to="/admin"
              aria-current={location.pathname === '/admin' ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location.pathname === '/admin'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-brand-800/70 hover:bg-brand-50 hover:text-brand-900'
              }`}
            >
              <Shield
                className={`w-5 h-5 ${location.pathname === '/admin' ? 'text-brand-600' : 'text-brand-800/40'}`}
              />
              Admin
            </Link>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-brand-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm">
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-900 truncate">{user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-brand-800/50 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-brand-800/70 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-100 z-30 px-2 pb-safe"
        aria-label="Primary"
      >
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                  active ? 'text-brand-600' : 'text-brand-800/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Logout confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-modal-title"
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <h2 id="signout-modal-title" className="font-bold text-brand-900 text-lg text-center mb-1">
              Sign out?
            </h2>
            <p className="text-sm text-brand-800/60 text-center mb-6">
              You'll need to sign in again to access your account.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 px-5 rounded-xl font-semibold text-sm bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-brand-100 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-gold-400 rounded-lg flex items-center justify-center">
            <ServicesIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif font-bold text-base text-brand-900">Aswini Makeover Artist</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Admin panel"
              className="text-brand-800/40 hover:text-brand-600 transition-colors"
            >
              <Shield className="w-5 h-5" />
            </Link>
          )}
          <button
            onClick={() => setShowConfirm(true)}
            aria-label="Sign out"
            className="text-brand-800/40 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    </>
  )
}
