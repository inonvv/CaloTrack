from pydantic import BaseModel

from app.db.models import Gender, ActivityLevel, Goal


class ProfileCreate(BaseModel):
    height: float  # cm
    weight: float  # kg
    age: int
    gender: Gender
    activity_level: ActivityLevel
    goal: Goal


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

    model_config = {"from_attributes": True}
