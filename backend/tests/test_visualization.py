"""
Pengujian endpoint visualisasi data balita (Stage 4.1).
Memverifikasi:
- Respon saat dataset belum diunggah (empty state).
- Agregasi statistik kuantitatif (total, valid, status TB/U, wilayah).
- Distribusi kategori status gizi (TB/U) dan persentasenya.
- Distribusi jenis kelamin balita.
- Distribusi wilayah (puskesmas, desa/kelurahan).
- Penerapan filter (puskesmas, gender, dll.) yang memutakhirkan seluruh agregasi.
- Penanganan dataset tanpa kolom status TB/U (pesan informatif tanpa error).
- Keamanan data (tidak memuat informasi pribadi PII).
"""
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.dataset_store import clear_active_dataset

client = TestClient(app)

SAMPLE_CSV = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Desa/Kel,Pukesmas,TB/U,ZS TB/U,BB Lahir
Anak A,1209012304200001,24,L,11.2,85.4,Balige III,Balige,Normal,-0.45,3.1
Anak B,1209012304200002,18,P,8.9,76.2,Lumban Bulbul,Balige,Normal,-0.82,2.9
Anak C,1209012304200003,36,L,12.5,88.0,Laguboti Kota,Laguboti,Pendek,-2.35,2.4
Anak D,1209012304200004,12,P,7.8,70.5,Siregar Aek Nalas,Laguboti,Normal,-0.95,3.0
Anak E,1209012304200005,48,L,14.8,98.2,Porsea,Porsea,Normal,0.15,3.3
Anak F,1209012304200006,30,P,10.2,82.5,Patane I,Porsea,Pendek,-2.18,2.3
Anak G,1209012304200007,15,L,9.1,75.0,Pardamean Sibisa,Ajibata,Normal,-1.10,3.0
Anak H,1209012304200008,42,P,11.0,86.4,Motung,Ajibata,Sangat Pendek,-3.12,2.1
"""


@pytest.fixture(autouse=True)
def run_around_tests():
    clear_active_dataset()
    yield
    clear_active_dataset()


def test_visualization_empty_state():
    """Ketika belum ada berkas diunggah, endpoint mengembalikan has_active_dataset=False."""
    response = client.get("/api/visualization")
    assert response.status_code == 200
    data = response.json()
    assert data["has_active_dataset"] is False
    assert data["total_unfiltered_rows"] == 0
    assert len(data["warnings"]) > 0


def test_visualization_with_dataset():
    """Mengunggah berkas lalu mengambil visualisasi data balita."""
    # 1. Upload CSV
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    upload_res = client.post(
        "/api/data/upload-preview",
        files={"file": ("balita_toba.csv", file_bytes, "text/csv")},
    )
    assert upload_res.status_code == 200

    # 2. Ambil visualisasi
    vis_res = client.get("/api/visualization")
    assert vis_res.status_code == 200
    data = vis_res.json()

    assert data["has_active_dataset"] is True
    assert data["total_unfiltered_rows"] == 8
    assert data["total_filtered_rows"] == 8

    # A. KPI
    summary = data["summary"]
    assert summary is not None
    assert summary["total_records"] == 8
    assert summary["records_with_tbu"] == 8
    assert summary["unique_regions_count"] == 4  # Balige, Laguboti, Porsea, Ajibata

    # B. Status Gizi (TB/U)
    assert data["has_status_tbu_column"] is True
    tbu_dist = {item["category"]: item for item in data["status_tbu_distribution"]}
    assert "Normal" in tbu_dist
    assert "Pendek" in tbu_dist
    assert "Sangat Pendek" in tbu_dist
    assert tbu_dist["Normal"]["count"] == 5
    assert tbu_dist["Pendek"]["count"] == 2
    assert tbu_dist["Sangat Pendek"]["count"] == 1
    # Denominator 8: Normal 5/8 = 62.5%
    assert tbu_dist["Normal"]["percentage"] == 62.5

    # C. Jenis Kelamin
    assert data["has_gender_column"] is True
    gender_dist = {item["category"]: item for item in data["gender_distribution"]}
    assert gender_dist["Laki-laki (L)"]["count"] == 4
    assert gender_dist["Perempuan (P)"]["count"] == 4
    assert gender_dist["Laki-laki (L)"]["percentage"] == 50.0

    # D. Wilayah
    assert len(data["region_distribution"]) == 4


def test_visualization_filter_by_puskesmas():
    """Filter Puskesmas Laguboti harus membatasi hasil ke 2 balita di Laguboti."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("balita_toba.csv", file_bytes, "text/csv")},
    )

    vis_res = client.get("/api/visualization?puskesmas=Laguboti")
    assert vis_res.status_code == 200
    data = vis_res.json()

    assert data["total_filtered_rows"] == 2
    summary = data["summary"]
    assert summary["total_records"] == 2
    assert summary["unique_regions_count"] == 1

    tbu_dist = {item["category"]: item for item in data["status_tbu_distribution"]}
    assert tbu_dist["Pendek"]["count"] == 1
    assert tbu_dist["Normal"]["count"] == 1
    assert tbu_dist["Pendek"]["percentage"] == 50.0


def test_visualization_filter_by_gender():
    """Filter jenis kelamin P hanya menyertakan balita perempuan."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("balita_toba.csv", file_bytes, "text/csv")},
    )

    vis_res = client.get("/api/visualization?jenis_kelamin=P")
    assert vis_res.status_code == 200
    data = vis_res.json()

    assert data["total_filtered_rows"] == 4
    gender_dist = data["gender_distribution"]
    assert len(gender_dist) == 1
    assert gender_dist[0]["category"] == "Perempuan (P)"
    assert gender_dist[0]["count"] == 4
    assert gender_dist[0]["percentage"] == 100.0


def test_visualization_missing_tbu_column():
    """Dataset tanpa kolom TB/U memberikan penjelasan ramah tanpa error 500."""
    csv_no_tbu = """Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Pukesmas
24,L,11.2,85.4,Balige
18,P,8.9,76.2,Balige
"""
    file_bytes = io.BytesIO(csv_no_tbu.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("no_tbu.csv", file_bytes, "text/csv")},
    )

    vis_res = client.get("/api/visualization")
    assert vis_res.status_code == 200
    data = vis_res.json()

    assert data["has_status_tbu_column"] is False
    assert data["status_tbu_unmapped_reason"] is not None
    assert len(data["status_tbu_distribution"]) == 0
    assert data["has_gender_column"] is True


def test_visualization_no_pii_in_response():
    """Memastikan tidak ada NIK atau nama anak yang bocor ke respons visualisasi."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("balita_toba.csv", file_bytes, "text/csv")},
    )

    vis_res = client.get("/api/visualization")
    raw_text = vis_res.text

    # Pastikan NIK atau nama balita tidak muncul sama sekali
    assert "1209012304200001" not in raw_text
    assert "Anak A" not in raw_text
    assert "Anak B" not in raw_text


SAMPLE_RICH_CSV = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Kecamatan,Pukesmas,Desa/Kel,TB/U,ZS TB/U,BB/U,ZS BB/U,BB/TB,ZS BB/TB
Anak 1,120901001,4,L,6.2,62.0,Balige,Balige,Balige I,Normal,-0.20,Normal,0.10,Gizi Baik,0.05
Anak 2,120901002,10,P,7.5,69.5,Balige,Balige,Balige II,Pendek,-2.40,Kurang,-2.10,Gizi Kurang,-2.20
Anak 3,120901003,18,L,10.0,79.0,Laguboti,Laguboti,Laguboti Kota,Normal,-0.50,Normal,-0.10,Gizi Baik,-0.30
Anak 4,120901004,28,P,9.8,81.0,Laguboti,Laguboti,Ompu Raja,Sangat Pendek,-3.20,Sangat Kurang,-3.10,Gizi Buruk,-3.40
Anak 5,120901005,36,L,14.0,95.0,Porsea,Porsea,Porsea I,Normal,0.30,Normal,0.20,Gizi Baik,0.15
Anak 6,120901006,48,P,13.5,92.0,Porsea,Porsea,Patane,Pendek,-2.10,Normal,-0.80,Gizi Baik,-0.40
"""


def test_visualization_rich_indicators():
    """Menguji ketersediaan distribusi TB/U, BB/U, BB/TB, usia, dan Z-Score."""
    file_bytes = io.BytesIO(SAMPLE_RICH_CSV.encode("utf-8"))
    upload_res = client.post(
        "/api/data/upload-preview",
        files={"file": ("rich_balita.csv", file_bytes, "text/csv")},
    )
    assert upload_res.status_code == 200

    vis_res = client.get("/api/visualization")
    assert vis_res.status_code == 200
    data = vis_res.json()

    assert data["has_active_dataset"] is True
    assert data["total_filtered_rows"] == 6

    # 1. Status BB/U
    assert data["has_status_bbu_column"] is True
    bbu_dist = {item["category"]: item["count"] for item in data["status_bbu_distribution"]}
    assert bbu_dist.get("Normal") == 4
    assert bbu_dist.get("Kurang") == 1
    assert bbu_dist.get("Sangat Kurang") == 1

    # 2. Status BB/TB
    assert data["has_status_bbtb_column"] is True
    bbtb_dist = {item["category"]: item["count"] for item in data["status_bbtb_distribution"]}
    assert bbtb_dist.get("Gizi Baik") == 4
    assert bbtb_dist.get("Gizi Kurang") == 1
    assert bbtb_dist.get("Gizi Buruk") == 1

    # 3. Kelompok Usia
    assert data["has_age_column"] is True
    age_dist = {item["category"]: item["count"] for item in data["age_group_distribution"]}
    assert age_dist.get("0–5 bln") == 1  # 4 bln
    assert age_dist.get("6–11 bln") == 1  # 10 bln
    assert age_dist.get("12–23 bln") == 1  # 18 bln
    assert age_dist.get("24–35 bln") == 1  # 28 bln
    assert age_dist.get("36–47 bln") == 1  # 36 bln
    assert age_dist.get("48–59 bln") == 1  # 48 bln

    # 4. Z-Score Stats
    zs_tbu = data["zscore_tbu"]
    assert zs_tbu["has_column"] is True
    assert zs_tbu["count_valid"] == 6
    assert zs_tbu["mean"] is not None
    assert len(zs_tbu["distribution"]) > 0

    zs_bbu = data["zscore_bbu"]
    assert zs_bbu["has_column"] is True
    assert zs_bbu["count_valid"] == 6

    zs_bbtb = data["zscore_bbtb"]
    assert zs_bbtb["has_column"] is True
    assert zs_bbtb["count_valid"] == 6


def test_visualization_filter_by_age_group():
    """Filter kelompok usia membatasi baris data yang dianalisis secara akurat."""
    file_bytes = io.BytesIO(SAMPLE_RICH_CSV.encode("utf-8"))
    client.post(
        "/api/data/upload-preview",
        files={"file": ("rich_balita.csv", file_bytes, "text/csv")},
    )

    # Filter usia 0-5 bulan -> hanya Anak 1 (4 bln)
    vis_res = client.get("/api/visualization?age_group=0-5")
    assert vis_res.status_code == 200
    data = vis_res.json()
    assert data["total_filtered_rows"] == 1
    assert data["summary"]["total_records"] == 1
    assert data["status_tbu_distribution"][0]["category"] == "Normal"

    # Filter usia 24-35 bulan -> hanya Anak 4 (28 bln)
    vis_res_2 = client.get("/api/visualization?age_group=24-35")
    assert vis_res_2.status_code == 200
    data_2 = vis_res_2.json()
    assert data_2["total_filtered_rows"] == 1
    assert data_2["status_tbu_distribution"][0]["category"] == "Sangat Pendek"


def test_visualization_out_of_scope_age_separation():
    """
    Menguji bahwa balita 0-59 bulan terpisah secara rapi dari anak >= 60 bulan:
    - 6 balita (0-59 bulan) persentasenya dihitung dari total balita in-scope (denominator 6).
    - 1 anak usia 65 bulan dikategorikan sebagai 'Di luar cakupan (≥ 60 bln)'.
    - Muncul peringatan di array warnings.
    """
    csv_mixed_age = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Desa/Kel,Pukesmas,TB/U,ZS TB/U
Anak A,1209012304200001,4,L,6.0,62.0,Balige I,Balige,Normal,-0.50
Anak B,1209012304200002,10,P,8.0,72.0,Balige I,Balige,Normal,-0.40
Anak C,1209012304200003,18,L,10.0,80.0,Balige I,Balige,Normal,-0.30
Anak D,1209012304200004,24,P,11.0,85.0,Balige I,Balige,Normal,-0.20
Anak E,1209012304200005,36,L,13.0,92.0,Balige I,Balige,Normal,-0.10
Anak F,1209012304200006,48,P,14.0,98.0,Balige I,Balige,Normal,0.10
Anak G,1209012304200007,65,L,18.0,112.0,Balige I,Balige,Normal,0.50
"""
    file_bytes = io.BytesIO(csv_mixed_age.encode("utf-8"))
    upload_res = client.post(
        "/api/data/upload-preview",
        files={"file": ("mixed_age.csv", file_bytes, "text/csv")},
    )
    assert upload_res.status_code == 200

    vis_res = client.get("/api/visualization")
    assert vis_res.status_code == 200
    data = vis_res.json()

    summary = data["summary"]
    assert summary["total_records"] == 7
    assert summary["in_scope_balita_count"] == 6
    assert summary["out_of_scope_age_count"] == 1

    # Periksa distribusi usia
    age_dist = {item["category"]: item for item in data["age_group_distribution"]}
    assert "Di luar cakupan (≥ 60 bln)" in age_dist
    assert age_dist["Di luar cakupan (≥ 60 bln)"]["count"] == 1

    # Kohor balita 0-5 bulan memiliki count 1 dan persentase 1/6 * 100 = 16.7% (bukan 1/7 = 14.3%)
    assert age_dist["0–5 bln"]["count"] == 1
    assert age_dist["0–5 bln"]["percentage"] == 16.7

    # Ada peringatan tentang data di luar cakupan
    assert any("≥ 60 bulan" in w for w in data["warnings"])


