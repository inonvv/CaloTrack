from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.db.models import User, Profile, DailyLog, FoodEntry, ExerciseEntry
from app.schemas.daily import (
    FoodEntryCreate, FoodEntryUpdate, FoodEntryResponse,
    ExerciseEntryCreate, ExerciseEntryResponse,
    DailyLogResponse, DailySummary,
)
from app.services.daily import get_or_create_daily_log, calculate_status, estimate_exercise_calories

router = APIRouter()


async def _require_profile(db: AsyncSession, user_id: int) -> Profile:
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile required")
    return profile


@router.get("", response_model=DailyLogResponse)
async def get_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_profile(db, current_user.id)
    log = await get_or_create_daily_log(db, current_user.id, date.today())
    return log


@router.post("/food", response_model=FoodEntryResponse, status_code=status.HTTP_201_CREATED)
async def add_food(
    body: FoodEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _require_profile(db, current_user.id)
    log = await get_or_create_daily_log(db, current_user.id, date.today())

    entry = FoodEntry(daily_log_id=log.id, **body.model_dump())
    db.add(entry)

    log.total_consumed = round(log.total_consumed + body.calories, 2)
    log.net_calories = round(log.total_consumed - log.total_burned, 2)
    log.status = calculate_status(log.net_calories, profile.daily_target)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/exercise", response_model=ExerciseEntryResponse, status_code=status.HTTP_201_CREATED)
async def add_exercise(
    body: ExerciseEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _require_profile(db, current_user.id)
    log = await get_or_create_daily_log(db, current_user.id, date.today())

    # Calculate calories burned using MET × weight × (duration / 60)
    calories_burned = estimate_exercise_calories(body.type, body.duration_min, profile.weight)

    entry = ExerciseEntry(
        daily_log_id=log.id,
        type=body.type,
        duration=body.duration_min,
        calories_burned=calories_burned,
    )
    db.add(entry)

    log.total_burned = round(log.total_burned + calories_burned, 2)
    log.net_calories = round(log.total_consumed - log.total_burned, 2)
    log.status = calculate_status(log.net_calories, profile.daily_target)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.patch("/food/{entry_id}", response_model=FoodEntryResponse)
async def update_food(
    entry_id: int,
    body: FoodEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _require_profile(db, current_user.id)

    result = await db.execute(
        select(FoodEntry)
        .join(DailyLog)
        .where(FoodEntry.id == entry_id, DailyLog.user_id == current_user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    log_result = await db.execute(select(DailyLog).where(DailyLog.id == entry.daily_log_id))
    log = log_result.scalar_one()

    old_calories = entry.calories

    if body.name is not None:
        entry.name = body.name
    if body.calories is not None:
        entry.calories = body.calories
        log.total_consumed = round(log.total_consumed - old_calories + body.calories, 2)
        log.net_calories = round(log.total_consumed - log.total_burned, 2)
        log.status = calculate_status(log.net_calories, profile.daily_target)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/food/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_food(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _require_profile(db, current_user.id)

    result = await db.execute(
        select(FoodEntry)
        .join(DailyLog)
        .where(FoodEntry.id == entry_id, DailyLog.user_id == current_user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    log_result = await db.execute(select(DailyLog).where(DailyLog.id == entry.daily_log_id))
    log = log_result.scalar_one()

    log.total_consumed = round(max(log.total_consumed - entry.calories, 0), 2)
    log.net_calories = round(log.total_consumed - log.total_burned, 2)
    log.status = calculate_status(log.net_calories, profile.daily_target)

    await db.delete(entry)
    await db.commit()


@router.get("/history", response_model=list[DailySummary])
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DailyLog)
        .where(DailyLog.user_id == current_user.id)
        .order_by(DailyLog.date.desc())
    )
    return result.scalars().all()
