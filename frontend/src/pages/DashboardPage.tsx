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

const STATUS_COLOR = {
  deficit: 'text-blue-600',
  maintenance: 'text-green-600',
  surplus: 'text-orange-500',
}

const STATUS_BG = {
  deficit: 'bg-blue-50 border-blue-200',
  maintenance: 'bg-green-50 border-green-200',
  surplus: 'bg-orange-50 border-orange-200',
}

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he')}
            className="text-xs border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {i18n.language === 'he' ? 'EN' : 'עב'}
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-xs text-muted-foreground hover:text-foreground px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Status */}
      <motion.div
        key={log.status}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`border rounded-xl px-4 py-3 text-center mb-5 ${STATUS_BG[log.status]}`}
      >
        <p className={`text-lg font-semibold ${STATUS_COLOR[log.status]}`}>
          {t(`dashboard.status.${log.status}`)}
        </p>
        {profile && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {Math.round(log.net_calories)} / {Math.round(profile.daily_target)} kcal target
          </p>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label={t('dashboard.consumed')} value={log.total_consumed} color="default" />
        <StatCard label={t('dashboard.burned')} value={log.total_burned} color="blue" />
        <StatCard label={t('dashboard.net')} value={log.net_calories} color="default" />
      </div>

      {/* Food log */}
      <AnimatePresence>
        {log.food_entries.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1 px-1">
              Food
            </p>
            <ul className="divide-y rounded-lg border overflow-hidden">
              {log.food_entries.map((e) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between px-3 py-2 text-sm bg-background"
                >
                  <span>{e.name}</span>
                  <span className="text-muted-foreground">{e.calories} kcal</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise log */}
      <AnimatePresence>
        {log.exercise_entries.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1 px-1">
              Exercise
            </p>
            <ul className="divide-y rounded-lg border overflow-hidden">
              {log.exercise_entries.map((e) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between px-3 py-2 text-sm bg-background"
                >
                  <span className="capitalize">{e.type.replace(/_/g, ' ')} · {e.duration_min} min</span>
                  <span className="text-blue-600 font-medium">−{Math.round(e.calories_burned)} kcal</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add buttons */}
      <AnimatePresence mode="wait">
        {activeForm === 'none' && (
          <motion.div
            key="buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3 mt-4"
          >
            <button
              onClick={() => setActiveForm('food')}
              className="border-2 border-dashed rounded-xl py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              🍽 {t('dashboard.addFood')}
            </button>
            <button
              onClick={() => setActiveForm('exercise')}
              className="border-2 border-dashed rounded-xl py-3 text-sm text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              🔥 {t('dashboard.addExercise')}
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
            className="space-y-3 border rounded-xl p-4 mt-4"
          >
            <p className="text-sm font-medium">🍽 Add food</p>
            <FoodSearch value={foodName} onChange={handleFoodNameChange} onSelect={handleSelectFood} placeholder={t('food.name')} />
            {baseCalories > 0 ? (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">Qty</label>
                <input
                  type="number" value={quantity} onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-20 border rounded-md px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                  min={0.25} step={0.25}
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  × {baseCalories} kcal{serving ? ` / ${serving}` : ''}
                </span>
                <span className="ml-auto text-sm font-semibold shrink-0">= {foodCal} kcal</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number" placeholder={t('food.calories')} value={foodCal}
                  onChange={(e) => setFoodCal(e.target.value)}
                  className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required min={1}
                />
                <span className="text-sm text-muted-foreground shrink-0">kcal</span>
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={addFood.isPending || !foodName || !foodCal}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium disabled:opacity-40">
                {addFood.isPending ? '…' : t('common.save')}
              </button>
              <button type="button" onClick={resetFoodForm}
                className="flex-1 border py-2 rounded-md text-sm text-muted-foreground hover:text-foreground">
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
            className="space-y-3 border rounded-xl p-4 mt-4"
          >
            <p className="text-sm font-medium">🔥 Log activity</p>

            {/* Exercise selector grouped by category */}
            <select
              value={exType}
              onChange={(e) => setExType(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            >
              {Object.entries(GROUPED).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((ex) => (
                    <option key={ex.type} value={ex.type}>{ex.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Duration */}
            <div className="flex items-center gap-2">
              <input
                type="number" value={exDuration}
                onChange={(e) => setExDuration(e.target.value)}
                className="w-24 border rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                min={1} max={600} required
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>

            {/* Live burn preview */}
            {burnPreview > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Estimated burn{profile ? ` · based on ${profile.weight}kg` : ''}
                </span>
                <span className="text-sm font-semibold text-blue-600">−{burnPreview} kcal</span>
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={addExercise.isPending || !exDuration}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium disabled:opacity-40">
                {addExercise.isPending ? '…' : 'Log activity'}
              </button>
              <button type="button"
                onClick={() => { setActiveForm('none'); setExType(DEFAULT_EXERCISE); setExDuration('30') }}
                className="flex-1 border py-2 rounded-md text-sm text-muted-foreground hover:text-foreground">
                {t('common.cancel')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'default' | 'blue' }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color === 'blue' ? 'text-blue-600' : ''}`}>
        {Math.round(value)}
      </p>
      <p className="text-xs text-muted-foreground">kcal</p>
    </div>
  )
}
