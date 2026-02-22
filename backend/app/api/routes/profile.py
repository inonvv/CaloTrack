from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.db.models import User, Profile
from app.schemas.profile import ProfileCreate, ProfileResponse
from app.services.bmr import calculate_bmr, calculate_tdee, calculate_daily_target

router = APIRouter()


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    body: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")

    bmr = calculate_bmr(body.height, body.weight, body.age, body.gender)
    tdee = calculate_tdee(bmr, body.activity_level)
    daily_target = calculate_daily_target(tdee, body.goal)

    profile = Profile(
        user_id=current_user.id,
        **body.model_dump(),
        bmr=bmr,
        tdee=tdee,
        daily_target=daily_target,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile
