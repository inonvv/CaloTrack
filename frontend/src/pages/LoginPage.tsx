import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      setToken(res.data.access_token)
      navigate('/')
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔥</div>
          <h1 className="text-3xl font-bold tracking-tight">CaloTrack</h1>
          <p className="text-sm text-muted-foreground mt-1">Your daily calorie companion</p>
        </div>

        {/* Card */}
        <div className="bg-card border rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('auth.loginTitle')}</h2>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input h-10"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input h-10"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground h-10 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>
        </div>

        <p className="text-sm text-center text-muted-foreground mt-4">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
