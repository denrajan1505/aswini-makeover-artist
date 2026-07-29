import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

interface RegisterForm {
  fullName: string
  email: string
  password: string
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterForm>({ fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const set = <K extends keyof RegisterForm>(k: K, v: RegisterForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signUp(form.email, form.password, form.fullName)
      toast.success('Account created! Welcome to Aswini Makeover Artist.')
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
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
          <p className="text-brand-800/60 text-sm mt-1">Enhance • Empower • Transform</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-brand-900 mb-6">Create your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-brand-800 mb-1.5">
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder="Your name"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-brand-800 mb-1.5">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@example.com"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-brand-800 mb-1.5">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="At least 6 characters"
                className="input-field"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign Up
            </button>
          </form>

          <p className="text-center text-sm text-brand-800/60 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
