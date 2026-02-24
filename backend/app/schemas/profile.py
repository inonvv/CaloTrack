import math
from typing import Optional

from pydantic import BaseModel, computed_field

from app.db.models import Gender, ActivityLevel, Goal


class ProfileCreate(BaseModel):
    height: float  # cm
    weight: float  # kg
    age: int
    gender: Gender
    activity_level: ActivityLevel
    goal: Goal


class ProfileUpdate(BaseModel):
    goal: Optional[Goal] = None
    waist_cm: Optional[float] = None
    neck_cm: Optional[float] = None
    hip_cm: Optional[float] = None


class ProfileResponse(BaseModel):
    height: float
    weight: float
    age: int
    gender: Gender
    activity_level: ActivityLevel
    goal: Goal
    bmr: float
    tdee: float
    daily_target: float
    waist_cm: Optional[float] = None
    neck_cm: Optional[float] = None
    hip_cm: Optional[float] = None

    # ── Always-available computed fields ──────────────────────────────────────

    @computed_field
    @property
    def min_calories(self) -> int:
        """NIH/Harvard/Mayo Clinic safe minimum: men ≥ 1500, women ≥ 1200 kcal/day."""
        return 1500 if self.gender == Gender.male else 1200

    @computed_field
    @property
    def bmi(self) -> float:
        """weight / height² — rough population-level screen."""
        h_m = self.height / 100
        return round(self.weight / (h_m ** 2), 1)

    @computed_field
    @property
    def hydration_ml(self) -> int:
        """EFSA 2010: 35 ml per kg body weight as baseline daily water intake."""
        return round(self.weight * 35)

    # ── Measurement-dependent computed fields ─────────────────────────────────

    def _compute_body_fat(self) -> Optional[float]:
        """US Navy body fat formula (Hodgdon & Beckett 1984). Error ±3–4%."""
        if not self.waist_cm or not self.neck_cm:
            return None
        h = self.height
        if self.gender == Gender.male:
            diff = self.waist_cm - self.neck_cm
            if diff <= 0:
                return None
            val = 495 / (1.0324 - 0.19077 * math.log10(diff) + 0.15456 * math.log10(h)) - 450
        else:
            if not self.hip_cm:
                return None
            diff = self.waist_cm + self.hip_cm - self.neck_cm
            if diff <= 0:
                return None
            val = 495 / (1.29579 - 0.35004 * math.log10(diff) + 0.22100 * math.log10(h)) - 450
        return round(max(val, 0.0), 1)

    @computed_field
    @property
    def body_fat_pct(self) -> Optional[float]:
        return self._compute_body_fat()

    @computed_field
    @property
    def lbm(self) -> Optional[float]:
        """Lean body mass = weight × (1 − body_fat_fraction)."""
        bf = self._compute_body_fat()
        if bf is None:
            return None
        return round(self.weight * (1 - bf / 100), 1)

    @computed_field
    @property
    def ffmi(self) -> Optional[float]:
        """Fat-Free Mass Index, normalized (Kouri et al. 1995). Natural ceiling ≈ 25."""
        lbm = self.lbm
        if lbm is None:
            return None
        h_m = self.height / 100
        normalized = lbm / (h_m ** 2) + 6.1 * (1.8 - h_m)
        return round(normalized, 1)

    @computed_field
    @property
    def protein_min(self) -> Optional[int]:
        """Minimum protein target: LBM × 1.6 g (Morton et al. 2018 meta-analysis)."""
        lbm = self.lbm
        if lbm is None:
            return None
        return round(lbm * 1.6)

    @computed_field
    @property
    def protein_max(self) -> Optional[int]:
        """Maximum protein target: LBM × 2.2 g (active muscle building)."""
        lbm = self.lbm
        if lbm is None:
            return None
        return round(lbm * 2.2)

    model_config = {"from_attributes": True}
