from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import DailyLog, DailyStatus

# ── MET values ────────────────────────────────────────────────────────────────
# Source: Compendium of Physical Activities (Ainsworth et al., 2011)
# https://sites.google.com/site/compendiumofphysicalactivities/
# Formula: kcal = MET × weight_kg × (duration_min / 60)
MET_VALUES: dict[str, float] = {
    "walking_slow": 2.8,            # <3.2 km/h
    "walking": 3.5,                 # moderate ~5 km/h
    "walking_fast": 4.3,            # brisk ~6 km/h
    "jogging": 7.0,                 # light jog ~8 km/h
    "running": 9.8,                 # ~10 km/h
    "running_fast": 11.5,           # >12 km/h
    "cycling_light": 4.0,           # <16 km/h leisure
    "cycling": 6.8,                 # moderate 16-19 km/h
    "cycling_vigorous": 10.0,       # >22 km/h
    "swimming": 6.0,                # moderate freestyle
    "swimming_vigorous": 9.8,       # vigorous freestyle
    "weight_training": 3.5,         # general, moderate
    "weight_training_vigorous": 6.0,# vigorous effort
    "hiit": 8.0,                    # high-intensity interval training
    "elliptical": 5.0,              # moderate resistance
    "rowing_machine": 7.0,          # moderate effort
    "stair_climbing": 8.8,          # stair climber machine
    "jump_rope": 10.0,              # moderate pace
    "yoga": 2.5,                    # hatha yoga
    "pilates": 3.0,                 # moderate
    "stretching": 2.3,              # general stretching
    "basketball": 6.5,              # non-game, general
    "soccer": 7.0,                  # general, recreational
    "tennis": 7.3,                  # singles
    "dancing": 4.8,                 # general social/aerobic
    "hiking": 6.0,                  # general, cross-country
    "other": 4.0,                   # conservative general estimate
}


def estimate_exercise_calories(exercise_type: str, duration_min: int, weight_kg: float) -> float:
    """
    Estimate kcal burned using the MET formula.
    kcal = MET × weight_kg × (duration_min / 60)
    """
    met = MET_VALUES.get(exercise_type, MET_VALUES["other"])
    return round(met * weight_kg * (duration_min / 60), 1)


async def get_or_create_daily_log(db: AsyncSession, user_id: int, log_date: date) -> DailyLog:
    """Return today's log, creating it if it doesn't exist. Idempotent."""
    result = await db.execute(
        select(DailyLog)
        .options(
            selectinload(DailyLog.food_entries),
            selectinload(DailyLog.exercise_entries),
        )
        .where(DailyLog.user_id == user_id, DailyLog.date == log_date)
    )
    log = result.scalar_one_or_none()
    if log:
        return log

    log = DailyLog(user_id=user_id, date=log_date)
    db.add(log)
    await db.commit()

    # Re-fetch with eager-loaded relationships
    result = await db.execute(
        select(DailyLog)
        .options(
            selectinload(DailyLog.food_entries),
            selectinload(DailyLog.exercise_entries),
        )
        .where(DailyLog.id == log.id)
    )
    return result.scalar_one()


def calculate_status(net_calories: float, daily_target: float) -> DailyStatus:
    """±100 kcal tolerance around target = maintenance."""
    diff = net_calories - daily_target
    if diff < -100:
        return DailyStatus.deficit
    if diff > 100:
        return DailyStatus.surplus
    return DailyStatus.maintenance
