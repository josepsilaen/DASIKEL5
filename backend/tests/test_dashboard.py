"""
Unit tests untuk endpoint Dashboard Utama Dinamis (/api/dashboard/summary).
Menguji:
1. Dashboard tanpa dataset aktif (has_active_dataset=False).
2. Dashboard dengan dataset aktif (agregasi aktual).
3. Dataset tanpa kolom TB/U (status stunting aman & bertanda unmapped).
4. Dataset tanpa kolom wilayah (has_region=False, wilayah=0).
5. Dataset tanpa tanggal pengukuran (has_date_trend=False, unmapped reason informatif).
6. Penggantian dataset aktif (data lama ditimpa total oleh data baru).
7. Penghapusan dataset aktif (DELETE /api/data/active-dataset mengembalikan dashboard ke empty).
8. Konsistensi ringkasan Dashboard dengan hasil agregasi Visualisasi (total, valid, stunting sejalan).
9. Pencegahan data sintetis tercampur dengan data aktual (tidak ada angka dummy 1247 atau 1083 saat aktif).
"""
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.dataset_store import clear_active_dataset

client = TestClient(app)

SAMPLE_CSV_FULL = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Kecamatan,Pukesmas,Desa/Kel,TB/U,Tanggal Pengukuran
Anak 1,120901001,12,L,9.0,75.0,Balige,Balige,Balige I,Normal,2024-01-15
Anak 2,120901002,24,P,10.5,82.0,Balige,Balige,Balige II,Pendek,2024-01-20
Anak 3,120901003,36,L,12.0,88.0,Laguboti,Laguboti,Laguboti Kota,Normal,2024-02-10
Anak 4,120901004,18,P,8.5,74.0,Laguboti,Laguboti,Ompu Raja,Sangat Pendek,2024-02-14
Anak 5,120901005,48,L,14.0,96.0,Porsea,Porsea,Porsea I,Normal,2024-03-05
"""

SAMPLE_CSV_NO_TBU = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Kecamatan,Pukesmas,Tanggal Pengukuran
Anak 1,120901001,12,L,9.0,75.0,Balige,Balige,2024-01-15
Anak 2,120901002,24,P,10.5,82.0,Balige,Balige,2024-01-20
"""

SAMPLE_CSV_NO_REGION = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,TB/U,Tanggal Pengukuran
Anak 1,120901001,12,L,9.0,75.0,Normal,2024-01-15
Anak 2,120901002,24,P,10.5,82.0,Pendek,2024-01-20
"""

SAMPLE_CSV_NO_DATE = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Kecamatan,Pukesmas,TB/U
Anak 1,120901001,12,L,9.0,75.0,Balige,Balige,Normal
Anak 2,120901002,24,P,10.5,82.0,Balige,Balige,Pendek
"""


@pytest.fixture(autouse=True)
def run_around_tests():
    clear_active_dataset()
    yield
    clear_active_dataset()


def test_1_dashboard_without_active_dataset():
    """1. Dashboard tanpa dataset aktif mengembalikan status has_active_dataset=False."""
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["has_active_dataset"] is False
    assert data["total_records"] == 0
    assert len(data["warnings"]) > 0


def test_2_dashboard_with_active_dataset():
    """2. Dashboard dengan dataset aktif mengembalikan metrik aktual lengkap."""
    file_bytes = io.BytesIO(SAMPLE_CSV_FULL.encode("utf-8"))
    upload_res = client.post(
        "/api/data/upload-preview",
        files={"file": ("dataset_full.csv", file_bytes, "text/csv")},
    )
    assert upload_res.status_code == 200

    dash_res = client.get("/api/dashboard/summary")
    assert dash_res.status_code == 200
    data = dash_res.json()

    assert data["has_active_dataset"] is True
    assert data["filename"] == "dataset_full.csv"
    assert data["total_records"] == 5
    assert data["valid_records"] == 5
    assert data["need_check_records"] == 0
    assert data["valid_percentage"] == 100.0

    # Wilayah
    assert data["has_region"] is True
    assert data["total_kecamatan"] == 3  # Balige, Laguboti, Porsea
    assert data["total_puskesmas"] == 3

    # Stunting TB/U
    assert data["has_status_tbu"] is True
    assert data["stunted_count"] == 2  # Anak 2 (Pendek) dan Anak 4 (Sangat Pendek)
    assert data["stunted_percentage"] == 40.0  # 2 dari 5 = 40.0%

    # Tren tanggal
    assert data["has_date_trend"] is True
    assert len(data["monthly_trend"]) == 3  # Jan, Feb, Mar

    # Faktor risiko fiktif tidak ditampilkan
    assert data["has_risk_factors"] is False
    assert data["risk_factors_unmapped_reason"] is not None

    # Preview baris data riil (tersamar)
    assert len(data["preview_rows"]) == 5
    assert "kodeAnak" in data["preview_rows"][0]
    assert "wilayah" in data["preview_rows"][0]


def test_3_dashboard_without_tbu():
    """3. Dataset tanpa kolom TB/U tidak menyebabkan error dan bertanda tidak tersedia."""
    file_bytes = io.BytesIO(SAMPLE_CSV_NO_TBU.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("no_tbu.csv", file_bytes, "text/csv")},
    )

    dash_res = client.get("/api/dashboard/summary")
    assert dash_res.status_code == 200
    data = dash_res.json()

    assert data["has_active_dataset"] is True
    assert data["has_status_tbu"] is False
    assert data["status_tbu_unmapped_reason"] is not None
    assert data["stunted_count"] == 0
    assert len(data["tbu_distribution"]) == 0


def test_4_dashboard_without_region():
    """4. Dataset tanpa kolom wilayah bertanda has_region=False."""
    file_bytes = io.BytesIO(SAMPLE_CSV_NO_REGION.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("no_region.csv", file_bytes, "text/csv")},
    )

    dash_res = client.get("/api/dashboard/summary")
    assert dash_res.status_code == 200
    data = dash_res.json()

    assert data["has_active_dataset"] is True
    assert data["has_region"] is False
    assert data["total_kecamatan"] == 0
    assert data["total_puskesmas"] == 0


def test_5_dashboard_without_date():
    """5. Dataset tanpa tanggal pengukuran memiliki has_date_trend=False dan alasan penjelas."""
    file_bytes = io.BytesIO(SAMPLE_CSV_NO_DATE.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("no_date.csv", file_bytes, "text/csv")},
    )

    dash_res = client.get("/api/dashboard/summary")
    assert dash_res.status_code == 200
    data = dash_res.json()

    assert data["has_active_dataset"] is True
    assert data["has_date_trend"] is False
    assert data["date_trend_unmapped_reason"] is not None
    assert len(data["monthly_trend"]) == 0


def test_6_dashboard_dataset_replacement():
    """6. Penggantian dataset menimpa dataset sebelumnya secara total."""
    # Upload dataset 1 (5 baris)
    file1 = io.BytesIO(SAMPLE_CSV_FULL.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("dataset_1.csv", file1, "text/csv")})

    res1 = client.get("/api/dashboard/summary").json()
    assert res1["filename"] == "dataset_1.csv"
    assert res1["total_records"] == 5

    # Upload dataset 2 (2 baris)
    file2 = io.BytesIO(SAMPLE_CSV_NO_TBU.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("dataset_2.csv", file2, "text/csv")})

    res2 = client.get("/api/dashboard/summary").json()
    assert res2["filename"] == "dataset_2.csv"
    assert res2["total_records"] == 2
    assert res2["has_status_tbu"] is False


def test_7_dashboard_dataset_deletion():
    """7. Penghapusan dataset aktif mengembalikan dashboard ke empty state."""
    file_bytes = io.BytesIO(SAMPLE_CSV_FULL.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("to_delete.csv", file_bytes, "text/csv")})

    # Verifikasi aktif
    res_before = client.get("/api/dashboard/summary").json()
    assert res_before["has_active_dataset"] is True

    # Hapus dataset aktif
    del_res = client.delete("/api/data/active-dataset")
    assert del_res.status_code == 200

    # Verifikasi kembali kosong
    res_after = client.get("/api/dashboard/summary").json()
    assert res_after["has_active_dataset"] is False
    assert res_after["total_records"] == 0


def test_8_consistency_with_visualization():
    """8. Konsistensi ringkasan Dashboard dengan agregasi Visualisasi."""
    file_bytes = io.BytesIO(SAMPLE_CSV_FULL.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("consistent.csv", file_bytes, "text/csv")})

    dash_data = client.get("/api/dashboard/summary").json()
    vis_data = client.get("/api/visualization").json()

    # Total baris harus sama persis
    assert dash_data["total_records"] == vis_data["total_unfiltered_rows"]
    assert dash_data["total_records"] == vis_data["summary"]["total_records"]

    # Jumlah data valid harus sama
    assert dash_data["valid_records"] == vis_data["summary"]["valid_records"]

    # Distribusi status stunting harus sejalan
    dash_tbu = {item["category"]: item["count"] for item in dash_data["tbu_distribution"]}
    vis_tbu = {item["category"]: item["count"] for item in vis_data["status_tbu_distribution"]}
    assert dash_tbu == vis_tbu


def test_9_prevention_of_synthetic_data_mixing():
    """9. Memastikan data sintetis contoh (1247, 1083, dsb.) tidak tercampur dengan data aktual."""
    file_bytes = io.BytesIO(SAMPLE_CSV_FULL.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("actual_data.csv", file_bytes, "text/csv")})

    dash_data = client.get("/api/dashboard/summary").json()

    # Angka harus murni dari dataset (5 baris), BUKAN angka statis 1247 atau 1083
    assert dash_data["total_records"] == 5
    assert dash_data["valid_records"] == 5
    assert dash_data["total_records"] != 1247
    assert dash_data["valid_records"] != 1083
    assert dash_data["need_check_records"] != 164

