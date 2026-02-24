import pytest

from app.services.bmr import calculate_bmr, calculate_tdee, calculate_daily_target, minimum_calories
from app.db.models import Gender, ActivityLevel, Goal


def test_bmr_male():
    # 10*75 + 6.25*175 - 5*30 + 5 = 1698.75
    bmr = calculate_bmr(175, 75, 30, Gender.male)
    assert bmr == pytest.approx(1698.75, rel=1e-3)


def test_bmr_female():
    # 10*60 + 6.25*165 - 5*25 - 161 = 1345.25
    bmr = calculate_bmr(165, 60, 25, Gender.female)
    assert bmr == pytest.approx(1345.25, rel=1e-3)


def test_tdee_sedentary():
    tdee = calculate_tdee(1698.75, ActivityLevel.sedentary)
    assert tdee == pytest.approx(1698.75 * 1.2, rel=1e-3)


def test_tdee_moderate():
    tdee = calculate_tdee(1698.75, ActivityLevel.moderate)
    assert tdee == pytest.approx(1698.75 * 1.55, rel=1e-3)


def test_tdee_active():
    tdee = calculate_tdee(1698.75, ActivityLevel.active)
    assert tdee == pytest.approx(1698.75 * 1.725, rel=1e-3)


def test_daily_target_lose():
    assert calculate_daily_target(2000, Goal.lose, Gender.male) == pytest.approx(1500, rel=1e-3)


def test_daily_target_maintain():
    assert calculate_daily_target(2000, Goal.maintain, Gender.male) == pytest.approx(2000, rel=1e-3)


def test_daily_target_gain():
    # Lean bulk: +300 kcal (PMC10620361)
    assert calculate_daily_target(2000, Goal.gain, Gender.male) == pytest.approx(2300, rel=1e-3)


def test_minimum_calories_male():
    assert minimum_calories(Gender.male) == 1500


def test_minimum_calories_female():
    assert minimum_calories(Gender.female) == 1200


def test_daily_target_floor_female():
    # Very low TDEE with lose goal — floor at 1200 for female
    assert calculate_daily_target(1500, Goal.lose, Gender.female) == pytest.approx(1200, rel=1e-3)


def test_daily_target_floor_male():
    # Low TDEE with lose goal — floor at 1500 for male
    assert calculate_daily_target(1800, Goal.lose, Gender.male) == pytest.approx(1500, rel=1e-3)
