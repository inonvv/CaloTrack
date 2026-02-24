from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.db.models import DailyStatus, InputType


class FoodEntryCreate(BaseModel):
    name: str
    calories: float
    input_type: InputType = InputType.structured


class FoodEntryUpdate(BaseModel):
    name: Optional[str] = None
    calories: Optional[float] = None


class FoodEntryResponse(BaseModel):
    id: int
    name: str
    calories: float
    input_type: InputType
    created_at: datetime

    model_config = {"from_attributes": True}


class ExerciseEntryCreate(BaseModel):
    type: str
    duration_min: int  # minutes


class ExerciseEntryResponse(BaseModel):
    id: int
    type: str
    duration_min: int = Field(alias="duration")  # ORM model uses `duration`
    calories_burned: float
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class DailyLogResponse(BaseModel):
    id: int
    date: date
    total_consumed: float
    total_burned: float
    net_calories: float
    status: DailyStatus
    food_entries: list[FoodEntryResponse] = []
    exercise_entries: list[ExerciseEntryResponse] = []

    model_config = {"from_attributes": True}


class DailySummary(BaseModel):
    date: date
    total_consumed: float
    total_burned: float
    net_calories: float
    status: DailyStatus

    model_config = {"from_attributes": True}
