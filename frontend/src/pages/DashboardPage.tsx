import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { FoodSearch } from '@/components/FoodSearch'
import type { FoodItem } from '@/lib/foodDatabase'
import { groupedExercises, previewCaloriesBurned } from '@/lib/exerciseDatabase'

// ── Types ──────────────────────────────────────────────────────────────────

interface Profile {
  weight: number
  daily_target: number
}

interface FoodEntry { id: number; name: string; calories: number }
interface ExerciseEntry { id: number; type: string; duration_min: number; calories_burned: number }

interface DailyLog {
  id: number
  date: string
  total_consumed: number
  total_burned: number
  net_calories: number
  status: 'deficit' | 'maintenance' | 'surplus'
  food_entries: FoodEntry[]
  exercise_entries: ExerciseEntry[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  deficit:     { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   bar: 'bg-blue-400' },
  maintenance: { bg: 'bg-green-50 border-green-200', text: 'text-green-700',  bar: 'bg-green-400' },
  surplus:     { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', bar: 'bg-orange-400' },
}

const STATUS_EMOJI = { deficit: '📉', maintenance: '✅', surplus: '📈' }

const GROUPED = groupedExercises()
const DEFAULT_EXERCISE = 'walking'

// ── Component ──────────────────────────────────────────────────────────────

type ActiveForm = 'none' | 'food' | 'exercise'

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const qc = useQueryClient()

  // Food form state
  const [foodName, setFoodName] = useState('')
  const [foodCal, setFoodCal] = useState('')
  const [baseCalories, setBaseCalories] = useState(0)
  const [serving, setServing] = useState('')
  const [quantity, setQuantity] = useState('1')

  // Exercise form state
  const [exType, setExType] = useState(DEFAULT_EXERCISE)
  const [exDuration, setExDuration] = useState('30')

  const [activeForm, setActiveForm] = useState<ActiveForm>('none')

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: profile } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/profile')).data,
    staleTime: Infinity,
  })

  const { data: log, isLoading, error } = useQuery<DailyLog>({
    queryKey: ['daily'],
    queryFn: async () => (await api.get('/daily')).data,
    retry: false,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addFood = useMutation({
    mutationFn: (body: { name: string; calories: number }) =>
      api.post('/daily/food', { ...body, input_type: 'structured' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily'] })
      resetFoodForm()
    },
  })

  const deleteFood = useMutation({
    mutationFn: (id: number) => api.delete(`/daily/food/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily'] }),
  })

  const addExercise = useMutation({
    mutationFn: (body: { type: string; duration_min: number }) =>
      api.post('/daily/exercise', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily'] })
      setActiveForm('none')
      setExType(DEFAULT_EXERCISE)
      setExDuration('30')
    },
  })

  // ── Food helpers ──────────────────────────────────────────────────────────

  function handleSelectFood(food: FoodItem) {
    setFoodName(food.name)
    setBaseCalories(food.calories)
    setServing(food.serving)
    setQuantity('1')
    setFoodCal(String(food.calories))
  }

  function handleFoodNameChange(name: string) {
    setFoodName(name)
    if (baseCalories > 0) { setBaseCalories(0); setServing(''); setQuantity('1') }
  }

  function handleQuantityChange(q: string) {
    setQuantity(q)
    const qty = parseFloat(q)
    if (baseCalories > 0 && qty > 0) setFoodCal(String(Math.round(baseCalories * qty)))
  }

  function resetFoodForm() {
    setFoodName(''); setFoodCal(''); setBaseCalories(0); setServing(''); setQuantity('1')
    setActiveForm('none')
  }

  // ── Exercise helpers ──────────────────────────────────────────────────────

  const weightKg = profile?.weight ?? 70
  const burnPreview = previewCaloriesBurned(exType, Number(exDuration) || 0, weightKg)

  // ── Guards ────────────────────────────────────────────────────────────────

  if (error) { navigate('/onboarding'); return null }
  if (isLoading || !log) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        {t('common.loading')}
      </div>
    )
  }

  const target = profile?.daily_target ?? 2000
  const consumedPct = Math.min(100, Math.round((log.total_consumed / target) * 100))
  const style = STATUS_STYLE[log.status]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h1 className="text-xl font-bold tracking-tight">CaloTrack</h1>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he')}
              className="text-xs border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {i18n.language === 'he' ? 'EN' : 'עב'}
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1 hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Status card */}
        <motion.div
          key={log.status}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border rounded-2xl p-4 ${style.bg}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-lg font-bold ${style.text}`}>
                {STATUS_EMOJI[log.status]} {t(`dashboard.status.${log.status}`)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {Math.round(log.net_calories)} / {Math.round(target)} kcal target
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">{consumedPct}%</p>
              <p className="text-xs text-muted-foreground">consumed</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${style.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${consumedPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('dashboard.consumed')} value={log.total_consumed} />
          <StatCard label={t('dashboard.burned')} value={log.total_burned} color="blue" />
          <StatCard label={t('dashboard.net')} value={log.net_calories} />
        </div>

        {/* Food log */}
        <AnimatePresence>
          {log.food_entries.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionLabel>🍽 Food</SectionLabel>
              <ul className="divide-y rounded-xl border overflow-hidden bg-card shadow-sm">
                {log.food_entries.map((e) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center justify-between px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium">{e.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground text-xs">{e.calories} kcal</span>
                      <button
                        onClick={() => deleteFood.mutate(e.id)}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors text-xs"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exercise log */}
        <AnimatePresence>
          {log.exercise_entries.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionLabel>🏃 Exercise</SectionLabel>
              <ul className="divide-y rounded-xl border overflow-hidden bg-card shadow-sm">
                {log.exercise_entries.map((e) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium capitalize">{e.type.replace(/_/g, ' ')} · {e.duration_min} min</span>
                    <span className="text-blue-600 font-semibold text-xs shrink-0">−{Math.round(e.calories_burned)} kcal</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add buttons / forms */}
        <AnimatePresence mode="wait">
          {activeForm === 'none' && (
            <motion.div
              key="buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 pt-1"
            >
              <button
                onClick={() => setActiveForm('food')}
                className="flex flex-col items-center gap-1 bg-card border rounded-xl py-4 text-sm hover:border-primary hover:bg-primary/5 transition-colors shadow-sm"
              >
                <span className="text-xl">🍽</span>
                <span className="font-medium text-xs">{t('dashboard.addFood')}</span>
              </button>
              <button
                onClick={() => setActiveForm('exercise')}
                className="flex flex-col items-center gap-1 bg-card border rounded-xl py-4 text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors shadow-sm"
              >
                <span className="text-xl">🏃</span>
                <span className="font-medium text-xs">{t('dashboard.addExercise')}</span>
              </button>
            </motion.div>
          )}

          {/* Food form */}
          {activeForm === 'food' && (
            <motion.form
              key="food-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onSubmit={(e) => { e.preventDefault(); addFood.mutate({ name: foodName, calories: Number(foodCal) }) }}
              className="bg-card border rounded-xl p-4 space-y-3 shadow-sm"
            >
              <p className="text-sm font-semibold">🍽 Add food</p>
              <FoodSearch value={foodName} onChange={handleFoodNameChange} onSelect={handleSelectFood} placeholder={t('food.name')} />
              {baseCalories > 0 ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground shrink-0">Qty</label>
                  <input
                    type="number" value={quantity} onChange={(e) => handleQuantityChange(e.target.value)}
                    className="w-20 border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                    min={0.25} step={0.25}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    × {baseCalories} kcal{serving ? ` / ${serving}` : ''}
                  </span>
                  <span className="ml-auto text-sm font-bold shrink-0">{foodCal} kcal</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number" placeholder={t('food.calories')} value={foodCal}
                    onChange={(e) => setFoodCal(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required min={1}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">kcal</span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={addFood.isPending || !foodName || !foodCal}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
                  {addFood.isPending ? '…' : t('common.save')}
                </button>
                <button type="button" onClick={resetFoodForm}
                  className="flex-1 border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            </motion.form>
          )}

          {/* Exercise form */}
          {activeForm === 'exercise' && (
            <motion.form
              key="exercise-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onSubmit={(e) => {
                e.preventDefault()
                addExercise.mutate({ type: exType, duration_min: Number(exDuration) })
              }}
              className="bg-card border rounded-xl p-4 space-y-3 shadow-sm"
            >
              <p className="text-sm font-semibold">🏃 Log activity</p>

              <select
                value={exType}
                onChange={(e) => setExType(e.target.value)}
                className="input"
              >
                {Object.entries(GROUPED).map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {items.map((ex) => (
                      <option key={ex.type} value={ex.type}>{ex.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number" value={exDuration}
                  onChange={(e) => setExDuration(e.target.value)}
                  className="w-24 border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                  min={1} max={600} required
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>

              {burnPreview > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Estimated burn{profile ? ` · based on ${profile.weight}kg` : ''}
                  </span>
                  <span className="text-sm font-bold text-blue-600">−{burnPreview} kcal</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={addExercise.isPending || !exDuration}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
                  {addExercise.isPending ? '…' : 'Log activity'}
                </button>
                <button type="button"
                  onClick={() => { setActiveForm('none'); setExType(DEFAULT_EXERCISE); setExDuration('30') }}
                  className="flex-1 border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
      {children}
    </p>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'blue' }) {
  return (
    <div className="bg-card border rounded-xl p-3 text-center shadow-sm">
      <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color === 'blue' ? 'text-blue-600' : ''}`}>
        {Math.round(value)}
      </p>
      <p className="text-xs text-muted-foreground">kcal</p>
    </div>
  )
}
