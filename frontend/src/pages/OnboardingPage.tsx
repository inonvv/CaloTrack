import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

type Gender = 'male' | 'female'
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'
type Goal = 'lose' | 'maintain' | 'gain'

export default function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

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
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t('onboarding.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('onboarding.subtitle')}</p>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}

        <Field label={t('onboarding.height')}>
          <input
            type="number"
            value={form.height}
            onChange={(e) => set('height', e.target.value)}
            className="input"
            required
            min={50}
            max={300}
          />
        </Field>

        <Field label={t('onboarding.weight')}>
          <input
            type="number"
            value={form.weight}
            onChange={(e) => set('weight', e.target.value)}
            className="input"
            required
            min={20}
            max={500}
          />
        </Field>

        <Field label={t('onboarding.age')}>
          <input
            type="number"
            value={form.age}
            onChange={(e) => set('age', e.target.value)}
            className="input"
            required
            min={10}
            max={120}
          />
        </Field>

        <Field label={t('onboarding.gender')}>
          <select
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
            className="input"
          >
            <option value="male">{t('onboarding.male')}</option>
            <option value="female">{t('onboarding.female')}</option>
          </select>
        </Field>

        <Field label={t('onboarding.activityLevel')}>
          <select
            value={form.activity_level}
            onChange={(e) => set('activity_level', e.target.value)}
            className="input"
          >
            <option value="sedentary">{t('onboarding.sedentary')}</option>
            <option value="light">{t('onboarding.light')}</option>
            <option value="moderate">{t('onboarding.moderate')}</option>
            <option value="active">{t('onboarding.active')}</option>
          </select>
        </Field>

        <Field label={t('onboarding.goal')}>
          <select
            value={form.goal}
            onChange={(e) => set('goal', e.target.value)}
            className="input"
          >
            <option value="lose">{t('onboarding.lose')}</option>
            <option value="maintain">{t('onboarding.maintain')}</option>
            <option value="gain">{t('onboarding.gain')}</option>
          </select>
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('onboarding.next')}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
