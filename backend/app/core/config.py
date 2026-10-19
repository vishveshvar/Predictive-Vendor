import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Base directory is predictivevendorml repo root
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

# Load environment variables
load_dotenv(BASE_DIR / "backend" / ".env")
load_dotenv(BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Predictive Vendor & Procurement Platform")
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-hex-key-change-in-production-min-32-chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    _allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
    ALLOWED_ORIGINS: List[str] = (
        [origin.strip() for origin in _allowed_origins_env.split(",") if origin.strip()]
        if _allowed_origins_env
        else [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "*"
        ]
    )

    # Database
    MONGODB_URI: str = os.getenv("MONGODB_URI", os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "predictive_vendor_db")

    # Firebase Authentication
    FIREBASE_CREDENTIALS_PATH: str | None = os.getenv("FIREBASE_CREDENTIALS_PATH", None)
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "predictive-vendor-demo")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n')


    # Email
    SMTP_HOST: str | None = os.getenv("SMTP_HOST", None)
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str | None = os.getenv("SMTP_USER", None)
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD", None)
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "alerts@predictivevendorml.com")
    EMAIL_FALLBACK_FILE: str = os.getenv("EMAIL_FALLBACK_FILE", "logs/email_outbox.log")

    # Power BI
    POWERBI_CLIENT_ID: str | None = os.getenv("POWERBI_CLIENT_ID", None)
    POWERBI_CLIENT_SECRET: str | None = os.getenv("POWERBI_CLIENT_SECRET", None)
    POWERBI_TENANT_ID: str | None = os.getenv("POWERBI_TENANT_ID", None)
    POWERBI_WORKSPACE_ID: str | None = os.getenv("POWERBI_WORKSPACE_ID", None)
    POWERBI_REPORT_ID: str | None = os.getenv("POWERBI_REPORT_ID", None)

    # Paths
    REPO_ROOT: Path = BASE_DIR
    MODEL_PATH: Path = BASE_DIR / "backend" / "ml_engine" / "model.pkl"
    METRICS_PATH: Path = BASE_DIR / "backend" / "ml_engine" / "metrics.json"
    DATASET_PATH: Path = BASE_DIR / "data" / "electronics_transactions.csv"
    FALLBACK_DB_PATH: Path = BASE_DIR / "data" / "db_snapshot.json"

settings = Settings()
