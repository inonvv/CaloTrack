import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface Profile {
  height: number
  weight: number
  age: number
  gender: 'male' | 'female'
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active'
  goal: 'lose' | 'maintain' | 'gain'
  bmr: number
  tdee: number
  daily_target: number
  min_calories: number
  // body measurements (optional)
  waist_cm: number | null
  neck_cm: number | null
  hip_cm: number | null
  // computed body composition (null when measurements missing)
  bmi: number
  hydration_ml: number
  body_fat_pct: number | null
  lbm: number | null
  ffmi: number | null
  protein_min: number | null
  protein_max: number | null
}

interface DailySummary {
  date: string
  total_consumed: number
  total_burned: number
  net_calories: number
  status: 'deficit' | 'maintenance' | 'surplus'
}

type HistoryView = 'list' | 'calendar'
type Status = DailySummary['status']

// ── Constants ──────────────────────────────────────────────────────────────

const BAR_COLOR: Record<Status, string> = {
  deficit:     'bg-blue-400',
  maintenance: 'bg-green-400',
  surplus:     'bg-orange-400',
}

const STATUS_PILL: Record<Status, string> = {
  deficit:     'border-blue-200 bg-blue-50 text-blue-700',
  maintenance: 'border-green-200 bg-green-50 text-green-700',
  surplus:     'border-orange-200 bg-orange-50 text-orange-600',
}

const ROW_BG: Record<Status, string> = {
  deficit:     'border-blue-100 bg-blue-50/50',
  maintenance: 'border-green-100 bg-green-50/50',
  surplus:     'border-orange-100 bg-orange-50/50',
}

// Solid badges used inside calendar cells
const CELL_BADGE: Record<Status, string> = {
  deficit:     'bg-blue-100 text-blue-700',
  maintenance: 'bg-green-100 text-green-700',
  surplus:     'bg-orange-100 text-orange-700',
}

// Cell background tint for logged days
const CELL_BG: Record<Status, string> = {
  deficit:     'bg-blue-50   border-blue-200',
  maintenance: 'bg-green-50  border-green-200',
  surplus:     'bg-orange-50 border-orange-200',
}

const GOAL_GRADIENT: Record<Profile['goal'], string> = {
  lose:     'from-blue-600 to-blue-400',
  maintain: 'from-green-600 to-green-500',
  gain:     'from-orange-500 to-orange-400',
}

const GOAL_ICON: Record<Profile['goal'], string> = {
  lose: '📉', maintain: '⚖️', gain: '📈',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatKcalShort(kcal: number): string {
  return kcal >= 1000 ? `${(kcal / 1000).toFixed(1)}k` : String(Math.round(kcal))
}

function activityShort(level: string, t: (k: string) => string) {
  return t(`onboarding.${level}`).split('—')[0].trim()
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonBlock({ h = 'h-24' }: { h?: string }) {
  return <div className={`${h} rounded-2xl bg-muted animate-pulse`} />
}

function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="h-[53px] bg-background border-b" />
      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        <SkeletonBlock h="h-28" />
        <SkeletonBlock h="h-44" />
        <SkeletonBlock h="h-32" />
        <SkeletonBlock h="h-56" />
        {[1, 2, 3].map((i) => <SkeletonBlock key={i} h="h-[76px]" />)}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // History view: 'list' | 'calendar'
  const [historyView, setHistoryView] = useState<HistoryView>('list')
  // null = derive from most-recent history entry; set when user navigates months
  const [calMonthOverride, setCalMonthOverride] = useState<Date | null>(null)

  // Goal change modal
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Profile['goal']>('maintain')

  // Measurements modal
  const [measModalOpen, setMeasModalOpen] = useState(false)
  const [mWaist, setMWaist] = useState('')
  const [mNeck, setMNeck] = useState('')
  const [mHip, setMHip] = useState('')

  const qc = useQueryClient()

  function openGoalModal() {
    setSelectedGoal(profile?.goal ?? 'maintain')
    setGoalModalOpen(true)
  }

  const updateGoal = useMutation({
    mutationFn: (goal: Profile['goal']) => api.patch('/profile', { goal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setGoalModalOpen(false)
    },
  })

  function openMeasModal() {
    setMWaist(profile?.waist_cm != null ? String(profile.waist_cm) : '')
    setMNeck(profile?.neck_cm != null ? String(profile.neck_cm) : '')
    setMHip(profile?.hip_cm != null ? String(profile.hip_cm) : '')
    setMeasModalOpen(true)
  }

  const saveMeasurements = useMutation({
    mutationFn: (body: Record<string, number | null>) => api.patch('/profile', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setMeasModalOpen(false)
    },
  })

  const clearMeasurements = useMutation({
    mutationFn: () => api.patch('/profile', { waist_cm: null, neck_cm: null, hip_cm: null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/profile')).data,
    staleTime: Infinity,
  })

  const { data: history = [], isLoading: historyLoading } = useQuery<DailySummary[]>({
    queryKey: ['history'],
    queryFn: async () => (await api.get('/daily/history')).data,
  })

  if (profileLoading || historyLoading) return <SkeletonLoader />

  const target = profile?.daily_target ?? 2000

  // Default calendar month: most recent logged month, or today
  const calMonth = calMonthOverride ?? (
    history.length > 0 ? new Date(history[0].date + 'T00:00:00') : new Date()
  )

  function prevMonth() {
    const d = new Date(calMonth)
    d.setMonth(d.getMonth() - 1)
    setCalMonthOverride(d)
  }

  function nextMonth() {
    const d = new Date(calMonth)
    d.setMonth(d.getMonth() + 1)
    setCalMonthOverride(d)
  }

  // Chart: last 30 days, oldest → newest
  const chartDays = [...history].slice(0, 30).reverse()
  const maxVal = Math.max(...chartDays.map((d) => d.total_consumed), target, 1)
  const targetPct = (target / maxVal) * 100

  return (
    <div className="min-h-screen bg-muted/20 pb-10">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="text-xs border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          ← {t('common.back')}
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">{t('profile.title')}</h1>
        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he')}
          className="text-xs border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          {i18n.language === 'he' ? 'EN' : 'עב'}
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* ── Goal hero ──────────────────────────────────────────────────── */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`rounded-2xl p-5 text-white bg-gradient-to-br ${GOAL_GRADIENT[profile.goal]} shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">
                  {t('profile.goal')}
                </p>
                <p className="text-xl font-bold">
                  {GOAL_ICON[profile.goal]} {t(`profile.goal_${profile.goal}`)}
                </p>
                <button
                  onClick={openGoalModal}
                  className="mt-2 text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  ✏️ {t('profile.changeGoal')}
                </button>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">{t('profile.target')}</p>
                <p className="text-3xl font-black tabular-nums leading-none">{Math.round(target)}</p>
                <p className="text-white/60 text-xs mt-0.5">kcal / day</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Body stats grid ────────────────────────────────────────────── */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="bg-card border rounded-2xl p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('profile.stats')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: '📏', label: t('profile.height'),   value: `${profile.height} cm` },
                { icon: '🏋️', label: t('profile.weight'),   value: `${profile.weight} kg` },
                { icon: '🎂', label: t('profile.age'),      value: `${profile.age} yr` },
                { icon: '👤', label: t('profile.gender'),   value: t(`profile.${profile.gender}`) },
                { icon: '🏃', label: t('profile.activity'), value: activityShort(profile.activity_level, t) },
                { icon: '🛡️', label: 'Min safe',            value: `${profile.min_calories} kcal` },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-muted/40 rounded-xl p-2.5 space-y-1">
                  <span className="text-lg leading-none">{icon}</span>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
                  <p className="text-xs font-semibold leading-tight">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Metabolic metrics ──────────────────────────────────────────── */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="bg-card border rounded-2xl p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('profile.metrics')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="BMR"               value={Math.round(profile.bmr)}          sub="Base rate" />
              <MetricCard label="TDEE"              value={Math.round(profile.tdee)}         sub="With activity" />
              <MetricCard label={t('profile.target')} value={Math.round(profile.daily_target)} sub="Daily goal" highlight />
            </div>
          </motion.div>
        )}

        {/* ── Body Composition ───────────────────────────────────────────── */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="bg-card border rounded-2xl p-4 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('profile.bodyComp')}
              </p>
              <button
                onClick={openMeasModal}
                className="text-xs text-primary hover:underline"
              >
                {profile.waist_cm != null ? `✏️ ${t('profile.editMeasurements')}` : `＋ ${t('profile.addMeasurements')}`}
              </button>
            </div>

            {/* Always-available row: BMI + Hydration */}
            <div className="grid grid-cols-2 gap-2">
              <BioCard
                label={t('profile.bmi')}
                value={String(profile.bmi)}
                sub={bmiCategory(profile.bmi, t)}
                accent={bmiAccent(profile.bmi)}
              />
              <BioCard
                label={t('profile.hydration')}
                value={`${(profile.hydration_ml / 1000).toFixed(1)} L`}
                sub={t('profile.perDay')}
              />
            </div>

            {/* Measurement-dependent metrics */}
            {profile.body_fat_pct != null ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <BioCard label={t('profile.bodyFat')}  value={`${profile.body_fat_pct}%`}    sub="Navy method" />
                  <BioCard label={t('profile.lbm')}      value={`${profile.lbm} kg`}           sub="Lean mass" />
                  <BioCard label={t('profile.ffmi')}     value={String(profile.ffmi)}           sub="Nat. max ~25" />
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('profile.protein')}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {profile.protein_min}–{profile.protein_max} g
                    <span className="text-xs font-normal text-muted-foreground ml-1">{t('profile.perDay')}</span>
                  </span>
                </div>
                <button
                  onClick={() => clearMeasurements.mutate()}
                  disabled={clearMeasurements.isPending}
                  className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
                >
                  {t('profile.clearMeasurements')}
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-1">
                {t('profile.measurementsSub')}
              </p>
            )}
          </motion.div>
        )}

        {/* ── 30-day trend chart ─────────────────────────────────────────── */}
        {chartDays.length > 0 && profile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border rounded-2xl p-4 shadow-sm space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('profile.chart')}
              </p>
              <p className="text-xs text-muted-foreground">
                {chartDays.length} {t('profile.days')}
              </p>
            </div>

            <div className="relative h-40 flex items-end gap-[3px]">
              {[25, 50, 75].map((pct) => (
                <div
                  key={pct}
                  className="absolute left-0 right-0 border-t border-muted/60 pointer-events-none"
                  style={{ bottom: `${pct}%` }}
                />
              ))}
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{ bottom: `${targetPct}%` }}
              >
                <div className="border-t-2 border-dashed border-primary/60" />
              </div>
              {chartDays.map((day, i) => {
                const heightPct = (day.total_consumed / maxVal) * 100
                return (
                  <div
                    key={day.date}
                    className="relative flex-1 flex flex-col justify-end group"
                    title={`${formatDate(day.date)}: ${Math.round(day.total_consumed)} kcal`}
                  >
                    <motion.div
                      className={`w-full rounded-t ${BAR_COLOR[day.status]} opacity-75 group-hover:opacity-100 transition-opacity cursor-default`}
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.013, ease: 'easeOut' }}
                      style={{ minHeight: 2 }}
                    />
                  </div>
                )
              })}
            </div>

            {chartDays.length >= 2 && (
              <div className="flex justify-between text-[10px] text-muted-foreground -mt-1">
                <span>{formatDateShort(chartDays[0].date)}</span>
                <span>{formatDateShort(chartDays[chartDays.length - 1].date)}</span>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-5 border-t-2 border-dashed border-primary/60 inline-block" />
                <span>{t('profile.target')}: {Math.round(target)} kcal</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <LegendDot color="bg-blue-400"   label={t('dashboard.status.deficit')} />
                <LegendDot color="bg-green-400"  label={t('dashboard.status.maintenance')} />
                <LegendDot color="bg-orange-400" label={t('dashboard.status.surplus')} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── History: toggle + view ──────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Section header + view toggle */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('history.title')}
            </p>
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button
                onClick={() => setHistoryView('list')}
                className={`px-3 py-1.5 transition-colors ${
                  historyView === 'list'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                ≡ {t('history.listView')}
              </button>
              <button
                onClick={() => setHistoryView('calendar')}
                className={`px-3 py-1.5 border-l transition-colors ${
                  historyView === 'calendar'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                📅 {t('history.calendarView')}
              </button>
            </div>
          </div>

          {/* Empty state */}
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              {t('history.empty')}
            </p>
          )}

          {/* Animated view switch */}
          {history.length > 0 && (
            <AnimatePresence mode="wait">
              {historyView === 'list' ? (

                /* ── List view ── */
                <motion.ul
                  key="list"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  {history.map((day, i) => {
                    const consumedPct = Math.min(100, Math.round((day.total_consumed / target) * 100))
                    return (
                      <motion.li
                        key={day.date}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className={`border rounded-xl px-3 py-2.5 ${ROW_BG[day.status]}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">{formatDate(day.date)}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_PILL[day.status]}`}>
                            {t(`dashboard.status.${day.status}`)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/50 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full ${BAR_COLOR[day.status]}`}
                            style={{ width: `${consumedPct}%` }}
                          />
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>🍽 {Math.round(day.total_consumed)} kcal</span>
                          {day.total_burned > 0 && (
                            <span>🏃 −{Math.round(day.total_burned)}</span>
                          )}
                          <span className="ml-auto font-semibold text-foreground tabular-nums">
                            {Math.round(day.net_calories)} kcal net
                          </span>
                        </div>
                      </motion.li>
                    )
                  })}
                </motion.ul>

              ) : (

                /* ── Calendar view ── */
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border rounded-2xl p-4 shadow-sm"
                >
                  <CalendarView
                    history={history}
                    calMonth={calMonth}
                    onPrevMonth={prevMonth}
                    onNextMonth={nextMonth}
                    lang={i18n.language}
                  />
                </motion.div>

              )}
            </AnimatePresence>
          )}
        </div>

      </div>

      {/* ── Measurements modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {measModalOpen && (
          <>
            <motion.div
              key="meas-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMeasModalOpen(false)}
            />
            <motion.div
              key="meas-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none"
            >
              <div className="bg-card rounded-2xl p-5 w-full max-w-xs shadow-2xl pointer-events-auto space-y-4">
                <div>
                  <h2 className="text-base font-semibold">{t('profile.editMeasurements')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('profile.measurementsSub')}</p>
                </div>

                <div className="space-y-2">
                  <MeasInput label={t('profile.waist')} value={mWaist} onChange={setMWaist} />
                  <MeasInput label={t('profile.neck')}  value={mNeck}  onChange={setMNeck} />
                  {profile?.gender === 'female' && (
                    <MeasInput label={t('profile.hip')} value={mHip} onChange={setMHip} />
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setMeasModalOpen(false)}
                    className="flex-1 border py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      const body: Record<string, number | null> = {
                        waist_cm: mWaist ? Number(mWaist) : null,
                        neck_cm:  mNeck  ? Number(mNeck)  : null,
                        hip_cm:   mHip   ? Number(mHip)   : null,
                      }
                      saveMeasurements.mutate(body)
                    }}
                    disabled={saveMeasurements.isPending || (!mWaist && !mNeck && !mHip)}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    {saveMeasurements.isPending ? '…' : t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Goal change modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {goalModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setGoalModalOpen(false)}
            />

            {/* Modal card */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none"
            >
              <div className="bg-card rounded-2xl p-5 w-full max-w-xs shadow-2xl pointer-events-auto">

                {/* Header */}
                <h2 className="text-base font-semibold">{t('profile.changeGoal')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                  {t('profile.changeGoalSub')}
                </p>

                {/* Goal picker */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {(['lose', 'maintain', 'gain'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGoal(g)}
                      className={[
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors',
                        selectedGoal === g
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      <span className="text-xl leading-none">{GOAL_ICON[g]}</span>
                      <span className="text-center leading-tight">{t(`profile.goal_${g}`)}</span>
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setGoalModalOpen(false)}
                    className="flex-1 border py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => updateGoal.mutate(selectedGoal)}
                    disabled={updateGoal.isPending || selectedGoal === profile?.goal}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    {updateGoal.isPending ? '…' : t('common.save')}
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── CalendarView ─────────────────────────────────────────────────────────────

function CalendarView({
  history,
  calMonth,
  onPrevMonth,
  onNextMonth,
  lang,
}: {
  history: DailySummary[]
  calMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  lang: string
}) {
  const { t } = useTranslation()

  // Build O(1) lookup map for the calendar
  const dataMap = new Map<string, DailySummary>()
  history.forEach((d) => dataMap.set(d.date, d))

  const year  = calMonth.getFullYear()
  const month = calMonth.getMonth()

  // Pad cells so the first day of the month lands on the correct weekday column
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth    = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Locale-aware narrow weekday headers (Sun…Sat), always LTR order
  const locale = lang === 'he' ? 'he-IL' : 'en-US'
  const dayHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + i) // Jan 7 2024 = Sunday
    return d.toLocaleDateString(locale, { weekday: 'narrow' })
  })

  const monthLabel = calMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  const now      = new Date()
  const todayKey = toDateKey(now)
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    // Force LTR so the 7-column grid always reads Sun → Sat left-to-right
    <div dir="ltr">

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-base"
        >
          ←
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          onClick={onNextMonth}
          disabled={isCurrentMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-base disabled:opacity-25 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          // Empty padding cell
          if (day === null) {
            return <div key={`pad-${i}`} className="h-14" />
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const entry   = dataMap.get(dateKey)
          const isToday = dateKey === todayKey
          const isFuture = new Date(year, month, day) > now

          return (
            <div
              key={dateKey}
              className={[
                'h-14 flex flex-col items-center justify-start pt-1.5 rounded-xl border transition-colors',
                entry
                  ? CELL_BG[entry.status]
                  : 'bg-muted/20 border-transparent',
                isToday && !entry
                  ? 'ring-2 ring-primary ring-offset-1 border-transparent'
                  : '',
              ].join(' ')}
            >
              {/* Day number */}
              <span className={[
                'text-[11px] font-medium leading-none',
                isToday       ? 'text-primary font-bold'    :
                entry         ? 'text-foreground'            :
                isFuture      ? 'text-muted-foreground/40'  :
                                'text-muted-foreground',
              ].join(' ')}>
                {day}
              </span>

              {/* Status badge (logged days only) */}
              {entry && (
                <>
                  <span className={`mt-1 text-[9px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center ${CELL_BADGE[entry.status]}`}>
                    {t(`dashboard.status.${entry.status}_initial`)}
                  </span>
                  <span className="text-[8px] text-muted-foreground mt-0.5 tabular-nums leading-none">
                    {formatKcalShort(entry.total_consumed)}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center mt-3 text-[10px] text-muted-foreground">
        <LegendDot color="bg-blue-300"   label={t('dashboard.status.deficit')} />
        <LegendDot color="bg-green-300"  label={t('dashboard.status.maintenance')} />
        <LegendDot color="bg-orange-300" label={t('dashboard.status.surplus')} />
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, highlight,
}: {
  label: string; value: number; sub: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/40'}`}>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p className={`text-xl font-black tabular-nums leading-tight my-0.5 ${highlight ? 'text-primary' : ''}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-sm inline-block ${color}`} />
      {label}
    </span>
  )
}

function BioCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string; accent?: string
}) {
  return (
    <div className="bg-muted/40 rounded-xl p-3 text-center space-y-0.5">
      <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
      <p className={`text-lg font-black tabular-nums leading-tight ${accent ?? ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
    </div>
  )
}

function MeasInput({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground w-32 shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        min={1}
        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function bmiCategory(bmi: number, t: (k: string) => string): string {
  if (bmi < 18.5) return t('profile.bmiUnderweight')
  if (bmi < 25)   return t('profile.bmiNormal')
  if (bmi < 30)   return t('profile.bmiOverweight')
  return t('profile.bmiObese')
}

function bmiAccent(bmi: number): string {
  if (bmi < 18.5) return 'text-blue-500'
  if (bmi < 25)   return 'text-green-600'
  if (bmi < 30)   return 'text-orange-500'
  return 'text-red-500'
}
