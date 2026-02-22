// MET values from the Compendium of Physical Activities (Ainsworth et al., 2011)
// Formula: kcal = MET × weight_kg × (duration_min / 60)

export interface ExerciseItem {
  type: string
  label: string
  met: number
  category: string
}

export const EXERCISE_LIST: ExerciseItem[] = [
  // ── Walking ────────────────────────────────────────────────────────
  { type: 'walking_slow',           label: 'Walking (slow)',              met: 2.8,  category: 'Walking' },
  { type: 'walking',                label: 'Walking',                     met: 3.5,  category: 'Walking' },
  { type: 'walking_fast',           label: 'Walking (brisk)',             met: 4.3,  category: 'Walking' },
  { type: 'hiking',                 label: 'Hiking',                      met: 6.0,  category: 'Walking' },

  // ── Running ────────────────────────────────────────────────────────
  { type: 'jogging',                label: 'Jogging',                     met: 7.0,  category: 'Running' },
  { type: 'running',                label: 'Running',                     met: 9.8,  category: 'Running' },
  { type: 'running_fast',           label: 'Running (fast)',              met: 11.5, category: 'Running' },

  // ── Cycling ────────────────────────────────────────────────────────
  { type: 'cycling_light',          label: 'Cycling (leisurely)',         met: 4.0,  category: 'Cycling' },
  { type: 'cycling',                label: 'Cycling',                     met: 6.8,  category: 'Cycling' },
  { type: 'cycling_vigorous',       label: 'Cycling (vigorous)',          met: 10.0, category: 'Cycling' },

  // ── Swimming ───────────────────────────────────────────────────────
  { type: 'swimming',               label: 'Swimming',                    met: 6.0,  category: 'Swimming' },
  { type: 'swimming_vigorous',      label: 'Swimming (vigorous)',         met: 9.8,  category: 'Swimming' },

  // ── Gym ────────────────────────────────────────────────────────────
  { type: 'weight_training',        label: 'Weight training',             met: 3.5,  category: 'Gym' },
  { type: 'weight_training_vigorous', label: 'Weight training (intense)', met: 6.0,  category: 'Gym' },
  { type: 'hiit',                   label: 'HIIT',                        met: 8.0,  category: 'Gym' },
  { type: 'elliptical',             label: 'Elliptical',                  met: 5.0,  category: 'Gym' },
  { type: 'rowing_machine',         label: 'Rowing machine',              met: 7.0,  category: 'Gym' },
  { type: 'stair_climbing',         label: 'Stair climbing',              met: 8.8,  category: 'Gym' },
  { type: 'jump_rope',              label: 'Jump rope',                   met: 10.0, category: 'Gym' },

  // ── Mind & Body ────────────────────────────────────────────────────
  { type: 'yoga',                   label: 'Yoga',                        met: 2.5,  category: 'Mind & Body' },
  { type: 'pilates',                label: 'Pilates',                     met: 3.0,  category: 'Mind & Body' },
  { type: 'stretching',             label: 'Stretching',                  met: 2.3,  category: 'Mind & Body' },

  // ── Sports ─────────────────────────────────────────────────────────
  { type: 'basketball',             label: 'Basketball',                  met: 6.5,  category: 'Sports' },
  { type: 'soccer',                 label: 'Soccer / Football',           met: 7.0,  category: 'Sports' },
  { type: 'tennis',                 label: 'Tennis',                      met: 7.3,  category: 'Sports' },
  { type: 'dancing',                label: 'Dancing',                     met: 4.8,  category: 'Sports' },

  // ── Other ──────────────────────────────────────────────────────────
  { type: 'other',                  label: 'Other activity',              met: 4.0,  category: 'Other' },
]

/** Preview calories burned — same formula as the backend */
export function previewCaloriesBurned(exerciseType: string, durationMin: number, weightKg: number): number {
  const ex = EXERCISE_LIST.find((e) => e.type === exerciseType)
  const met = ex?.met ?? 4.0
  return Math.round(met * weightKg * (durationMin / 60))
}

/** Group exercises by category for the <optgroup> select */
export function groupedExercises(): Record<string, ExerciseItem[]> {
  return EXERCISE_LIST.reduce<Record<string, ExerciseItem[]>>((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {})
}
