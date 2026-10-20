from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = None

    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "Platina110,"
    MYSQL_DATABASE: str = "smart_campus"
    MYSQL_SSL: bool = False
    
    JWT_SECRET: str = "super_secret_jwt_key_change_in_production"
    ALGORITHM: str = "HS256"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
