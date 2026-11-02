"""
Pengujian otomatis untuk endpoint Health Check menggunakan pytest dan TestClient dari FastAPI.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Menguji bahwa endpoint root (GET /) mengembalikan status 200 dan informasi aplikasi."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Stunting Toba API"
    assert data["status"] == "online"
    assert data["health_check"] == "/api/health"


def test_health_check_endpoint():
    """Menguji bahwa endpoint health (GET /api/health) mengembalikan status 200 dan schema yang valid."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Backend Stunting Toba" in data["message"]
    assert data["version"] == "1.0.0"
    assert "timestamp" in data
