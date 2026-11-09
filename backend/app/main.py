"""
Entry point utama untuk backend FastAPI Stunting Toba.
Mengatur inisialisasi aplikasi, middleware CORS, dan routing API.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.endpoints import health, data_management, visualization, dashboard

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "API Fondasi untuk Sistem Analisis Faktor Risiko Stunting di Kabupaten Toba. "
        "Menyediakan endpoint untuk konektivitas, analisis data, dan machine learning."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Konfigurasi CORS agar hanya origin frontend lokal yang diizinkan
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Hubungkan router endpoints di bawah prefix /api
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(data_management.router, prefix=settings.API_V1_STR)
app.include_router(visualization.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    """
    Endpoint root sederhana untuk verifikasi cepat via browser.
    """
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }
