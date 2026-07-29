import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-100 via-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-gold-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="font-serif text-2xl font-bold text-brand-900">Aswini Makeover Artist</h1>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4" aria-live="polite">
              <h2 className="text-lg font-bold text-brand-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-brand-800/60">We sent a password reset link to {email}.</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-brand-900 mb-2">Reset your password</h2>
              <p className="text-sm text-brand-800/60 mb-6">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <label htmlFor="forgot-email" className="sr-only">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Reset Link
                </button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-brand-800/60 mt-5">
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
