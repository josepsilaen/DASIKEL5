import os
import secrets
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.endpoints import health, data_management, visualization, dashboard, analytics, etl, history, ml, warehouse

# API-key sederhana untuk demonstrasi internal. Ini BUKAN otorisasi multi-pengguna.
# Pada production, pastikan variabel STUNTING_API_KEY wajib diatur.
_ENV = os.getenv("STUNTING_ENV", "development").lower()
_API_KEY = os.getenv("STUNTING_API_KEY", "")
if _ENV == "production" and not _API_KEY:
    raise RuntimeError("Mode production wajib mengatur STUNTING_API_KEY; jangan deploy tanpa kontrol akses.")

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

@app.middleware("http")
async def require_key_for_data_endpoints(request,call_next):
    # Health check boleh anonim; seluruh API data memerlukan key bila diatur.
    if _API_KEY and request.url.path.startswith("/api/") and request.url.path != "/api/health":
        supplied=request.headers.get("X-API-Key","")
        if not secrets.compare_digest(supplied,_API_KEY):
            return JSONResponse(status_code=401,content={"detail":"X-API-Key salah atau belum diberikan."})
    return await call_next(request)

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
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(etl.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(warehouse.router, prefix=settings.API_V1_STR)


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
