import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "AICTE SmartFlow"
    TAGLINE: str = "Smarter Approvals. Proactive Compliance. Zero Missed Deadlines."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aicte_smartflow_hackathon_super_secret_jwt_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'aicte_smartflow.db'}")
    
    # Storage
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    SAMPLE_DOCS_DIR: Path = BASE_DIR / "sample_documents"
    
    # AI / LLM Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Email / Notification Simulation
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "false").lower() == "true"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLE_DOCS_DIR.mkdir(parents=True, exist_ok=True)
