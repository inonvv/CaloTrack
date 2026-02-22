from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://calotrack:calotrack@localhost:5432/calotrack"
    JWT_SECRET: str = "changeme"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    ENV: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
