import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

type Gender = 'male' | 'female'
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'
type Goal = 'lose' | 'maintain' | 'gain'

export default function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // If the user already has a profile, skip onboarding and go to dashboard
  useEffect(() => {
    api.get('/profile').then(() => navigate('/', { replace: true })).catch(() => {})
  }, [navigate])

  const [form, setForm] = useState({
    height: '',
    weight: '',
    age: '',
    gender: 'male' as Gender,
    activity_level: 'moderate' as ActivityLevel,
    goal: 'maintain' as Goal,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/profile', {
        height: Number(form.height),
        weight: Number(form.weight),
        age: Number(form.age),
        gender: form.gender,
        activity_level: form.activity_level,
        goal: form.goal,
      })
      navigate('/')
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        // Profile already exists — go straight to dashboard
        navigate('/', { replace: true })
      } else {
        setError(t('common.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('onboarding.subtitle')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Body measurements */}
          <div className="bg-card border rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label={`${t('onboarding.height')} (cm)`}>
                <input
                  type="number" value={form.height}
                  onChange={(e) => set('height', e.target.value)}
                  className="input text-center" required min={50} max={300} placeholder="175"
                />
              </Field>
              <Field label={`${t('onboarding.weight')} (kg)`}>
                <input
                  type="number" value={form.weight}
                  onChange={(e) => set('weight', e.target.value)}
                  className="input text-center" required min={20} max={500} placeholder="70"
                />
              </Field>
              <Field label={`${t('onboarding.age')} (yr)`}>
                <input
                  type="number" value={form.age}
                  onChange={(e) => set('age', e.target.value)}
                  className="input text-center" required min={10} max={120} placeholder="25"
                />
              </Field>
            </div>

            <Field label={t('onboarding.gender')}>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as Gender[]).map((g) => (
                  <button
                    key={g} type="button"
                    onClick={() => set('gender', g)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.gender === g
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {g === 'male' ? `♂ ${t('onboarding.male')}` : `♀ ${t('onboarding.female')}`}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Lifestyle */}
          <div className="bg-card border rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lifestyle</p>
            <Field label={t('onboarding.activityLevel')}>
              <select value={form.activity_level} onChange={(e) => set('activity_level', e.target.value)} className="input">
                <option value="sedentary">{t('onboarding.sedentary')}</option>
                <option value="light">{t('onboarding.light')}</option>
                <option value="moderate">{t('onboarding.moderate')}</option>
                <option value="active">{t('onboarding.active')}</option>
              </select>
            </Field>
            <Field label={t('onboarding.goal')}>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'lose', label: '📉 Lose', t: t('onboarding.lose') },
                  { value: 'maintain', label: '⚖️ Maintain', t: t('onboarding.maintain') },
                  { value: 'gain', label: '📈 Gain', t: t('onboarding.gain') },
                ] as { value: Goal; label: string; t: string }[]).map((g) => (
                  <button
                    key={g.value} type="button"
                    onClick={() => set('goal', g.value)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.goal === g.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {g.t}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground h-11 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? t('common.loading') : t('onboarding.next')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
