from app.db.models import Gender, ActivityLevel, Goal

ACTIVITY_MULTIPLIERS = {
    ActivityLevel.sedentary: 1.2,
    ActivityLevel.light: 1.375,
    ActivityLevel.moderate: 1.55,
    ActivityLevel.active: 1.725,
}

GOAL_ADJUSTMENTS = {
    Goal.lose: -500,
    Goal.maintain: 0,
    Goal.gain: 300,
}


def calculate_bmr(height: float, weight: float, age: int, gender: Gender) -> float:
    """Mifflin-St Jeor equation. Returns kcal/day."""
    base = 10 * weight + 6.25 * height - 5 * age
    return round(base + 5 if gender == Gender.male else base - 161, 2)


def calculate_tdee(bmr: float, activity_level: ActivityLevel) -> float:
    return round(bmr * ACTIVITY_MULTIPLIERS[activity_level], 2)


def minimum_calories(gender: Gender) -> int:
    """NIH/Harvard/Mayo Clinic safe minimum: men ≥ 1500, women ≥ 1200 kcal/day."""
    return 1500 if gender == Gender.male else 1200


def calculate_daily_target(tdee: float, goal: Goal, gender: Gender) -> float:
    return max(round(tdee + GOAL_ADJUSTMENTS[goal], 2), minimum_calories(gender))
