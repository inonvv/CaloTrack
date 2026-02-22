from datetime import datetime, date
from enum import Enum

from sqlalchemy import String, Integer, Float, ForeignKey, Date, DateTime, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Gender(str, Enum):
    male = "male"
    female = "female"


class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"


class Goal(str, Enum):
    lose = "lose"
    maintain = "maintain"
    gain = "gain"


class DailyStatus(str, Enum):
    deficit = "deficit"
    maintenance = "maintenance"
    surplus = "surplus"


class InputType(str, Enum):
    structured = "structured"
    free_text = "free_text"
    image = "image"
    record = "record"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile: Mapped["Profile"] = relationship("Profile", back_populates="user", uselist=False)
    daily_logs: Mapped[list["DailyLog"]] = relationship("DailyLog", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    height: Mapped[float] = mapped_column(Float, nullable=False)  # cm
    weight: Mapped[float] = mapped_column(Float, nullable=False)  # kg
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[Gender] = mapped_column(SAEnum(Gender), nullable=False)
    activity_level: Mapped[ActivityLevel] = mapped_column(SAEnum(ActivityLevel), nullable=False)
    goal: Mapped[Goal] = mapped_column(SAEnum(Goal), nullable=False)
    bmr: Mapped[float] = mapped_column(Float, nullable=False)
    tdee: Mapped[float] = mapped_column(Float, nullable=False)
    daily_target: Mapped[float] = mapped_column(Float, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="profile")


class DailyLog(Base):
    __tablename__ = "daily_logs"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    total_consumed: Mapped[float] = mapped_column(Float, default=0.0)
    total_burned: Mapped[float] = mapped_column(Float, default=0.0)
    net_calories: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[DailyStatus] = mapped_column(SAEnum(DailyStatus), default=DailyStatus.maintenance)

    user: Mapped["User"] = relationship("User", back_populates="daily_logs")
    food_entries: Mapped[list["FoodEntry"]] = relationship("FoodEntry", back_populates="daily_log")
    exercise_entries: Mapped[list["ExerciseEntry"]] = relationship("ExerciseEntry", back_populates="daily_log")


class FoodEntry(Base):
    __tablename__ = "food_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    daily_log_id: Mapped[int] = mapped_column(Integer, ForeignKey("daily_logs.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    input_type: Mapped[InputType] = mapped_column(SAEnum(InputType), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    daily_log: Mapped["DailyLog"] = relationship("DailyLog", back_populates="food_entries")


class ExerciseEntry(Base):
    __tablename__ = "exercise_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    daily_log_id: Mapped[int] = mapped_column(Integer, ForeignKey("daily_logs.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)  # minutes
    calories_burned: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    daily_log: Mapped["DailyLog"] = relationship("DailyLog", back_populates="exercise_entries")
