"""
Konfigurasi dasar aplikasi FastAPI Stunting Toba.
Menyimpan variabel global seperti nama aplikasi, versi, dan konfigurasi CORS.
"""
from typing import List


class Settings:
    PROJECT_NAME: str = "Stunting Toba API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Daftar origin lokal yang diizinkan untuk komunikasi frontend-backend
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
