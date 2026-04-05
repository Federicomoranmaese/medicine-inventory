from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str
    jwt_secret: str
    admin_password: str
    assistant_pin: str = "1234"
    database_url: str = "sqlite:////app/data/db/inventory.db"
    images_dir: str = "/app/data/images"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 días

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
