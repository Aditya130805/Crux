"""
Configuration management for Crux backend
Loads environment variables and provides application settings
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Crux API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # PostgreSQL Database
    DATABASE_URL: str
    
    # Neo4j Graph Database
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str
    
    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT Authentication
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # GitHub OAuth
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback/github"
    
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Allow CORS origins to be set via environment variable (comma-separated)
    # For production, set: CORS_ORIGINS_EXTRA=https://your-app.vercel.app,https://crux.io
    CORS_ORIGINS_EXTRA: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
