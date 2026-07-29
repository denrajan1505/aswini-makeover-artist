from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    secret_key: str = "change-me-in-production"
    cors_origins: List[str] = ["http://localhost:5173"]
    admin_emails: List[str] = []

    whatsapp_number: str = "919094678502"
    frontend_url: str = "http://localhost:5173"
    advance_payment_percent: float = 30.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
