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


def test_10_age_distribution_excludes_parent_age():
    """10. Memastikan distribusi usia hanya menggunakan usia_saat_ukur balita, bukan umur orang tua."""
    csv_content = """Nama Balita,NIK,Usia Saat Ukur,Umur Ibu,Umur Ayah,Jenis Kelamin,Berat,Tinggi,Kecamatan,TB/U
Anak 1,120901001,12,28,32,L,9.0,75.0,Balige,Normal
Anak 2,120901002,24,30,35,P,10.5,82.0,Balige,Pendek
"""
    file_bytes = io.BytesIO(csv_content.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("parent_age.csv", file_bytes, "text/csv")})

    dash_data = client.get("/api/dashboard/summary").json()
    assert dash_data["has_age"] is True
    assert dash_data["in_scope_balita_count"] == 2
    assert dash_data["out_of_scope_age_count"] == 0

    # Usia balita 12 bln (kategori 12–23 bln) dan 24 bln (kategori 24–35 bln)
    cat_counts = {item["category"]: item["count"] for item in dash_data["age_distribution"]}
    matching_12_23 = [cnt for cat, cnt in cat_counts.items() if "12" in cat and "23" in cat]
    matching_24_35 = [cnt for cat, cnt in cat_counts.items() if "24" in cat and "35" in cat]
    assert len(matching_12_23) == 1 and matching_12_23[0] == 1
    assert len(matching_24_35) == 1 and matching_24_35[0] == 1
    # Pastikan umur ibu/ayah (28, 30, 32, 35 tahun) tidak masuk sebagai bulan balita
    out_of_scope = [cnt for cat, cnt in cat_counts.items() if "60" in cat or "luar" in cat.lower()]
    assert len(out_of_scope) == 0 or out_of_scope[0] == 0


def test_11_stunting_not_computed_from_raw_height():
    """11. Memastikan status stunting tidak direka dari tinggi badan mentah jika TB/U belum dipetakan."""
    csv_content = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi Badan
Anak Pendek,120901001,24,L,8.5,65.0
Anak Normal,120901002,24,P,11.0,85.0
"""
    file_bytes = io.BytesIO(csv_content.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("raw_height_only.csv", file_bytes, "text/csv")})

    dash_data = client.get("/api/dashboard/summary").json()
    # has_status_tbu harus False karena tidak ada kolom status TB/U terpetakan
    assert dash_data["has_status_tbu"] is False
    assert dash_data["stunted_count"] == 0
    assert dash_data["stunted_percentage"] == 0.0
    assert len(dash_data["tbu_distribution"]) == 0
    assert "belum dipetakan" in dash_data["status_tbu_unmapped_reason"].lower()


def test_12_quality_and_completeness_summary():
    """12. Memastikan panel kualitas dan kelengkapan data merangkum temuan dengan tepat."""
    csv_content = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Kecamatan,TB/U
Anak 1,120901001,12,L,9.0,75.0,Balige,Normal
Anak 1,120901001,12,L,9.0,75.0,Balige,Normal
Anak Lebih Usia,120901003,72,P,18.0,110.0,Laguboti,Normal
"""
    file_bytes = io.BytesIO(csv_content.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("quality_check.csv", file_bytes, "text/csv")})

    dash_data = client.get("/api/dashboard/summary").json()
    assert dash_data["total_records"] == 3
    assert dash_data["duplicates_count"] == 1
    assert dash_data["out_of_scope_age_count"] == 1
    assert len(dash_data["quality_highlights"]) > 0
    assert dash_data["updated_at"] is not None


def test_13_dashboard_tableau_analytics_and_filter_action():
    """13. Memastikan Dashboard Utama memuat 5 kelompok Tableau secara dinamis dan mendukung filter aksi desa."""
    csv_content = """Nama Balita,NIK,Usia Saat Ukur,Jenis Kelamin,Berat,Tinggi,Desa/Kel,Pukesmas,TB/U,ZS TB/U,BB Lahir,TB Lahir,Naik BB,Kelas Ibu,LiLA
Anak 1,120901,4,L,5.8,61.0,Lumban,Balige,Normal,-0.40,3.2,49.0,N,Ya,24.5
Anak 2,120902,8,P,7.5,69.5,Lumban,Balige,Pendek,-2.30,2.2,46.0,T,Tidak,21.0
Anak 3,120903,15,L,9.0,76.0,Sigumpar,Sigumpar,Normal,-0.80,3.0,48.5,N,Ya,25.0
Anak 4,120904,26,P,10.0,82.0,Sigumpar,Sigumpar,Sangat Pendek,-3.10,2.1,45.0,T,Tidak,20.5
Anak 5,120905,38,L,12.0,89.0,Narumonda,Porsea,Normal,0.20,3.4,50.0,N,Ya,26.0
Anak 6,120906,50,P,13.5,94.0,Narumonda,Porsea,Pendek,-2.20,2.3,47.0,O,Tidak,22.0
"""
    file_bytes = io.BytesIO(csv_content.encode("utf-8"))
    client.post("/api/data/upload-preview", files={"file": ("dashboard_tableau.csv", file_bytes, "text/csv")})

    # A. Dashboard Summary tanpa filter desa (seluruh wilayah)
    dash_data = client.get("/api/dashboard/summary").json()
    assert dash_data["has_active_dataset"] is True
    assert "tableau_analytics" in dash_data
    t_data = dash_data["tableau_analytics"]
    assert t_data is not None

    # Bagian 1: Berat Lahir
    s1 = t_data["section1_birth_weight"]
    assert s1["has_column"] is True
    assert s1["total_valid"] == 6
    assert s1["bblr_count"] == 3
    assert s1["bblr_stunting_rate"] == 100.0
    assert s1["normal_stunting_rate"] == 0.0

    # Bagian 2: Kelompok Usia
    s2 = t_data["section2_age_cohort"]
    assert s2["has_column"] is True
    assert len(s2["cohorts"]) == 6

    # Bagian 3: Sebaran Wilayah
    s3 = t_data["section3_regional_spread"]
    assert s3["has_column"] is True
    assert s3["total_desas_count"] == 3
    assert len(s3["top_10_high_stunting_desas"]) == 3

    # Bagian 4: Posyandu & Pola Asuh
    s4 = t_data["section4_posyandu_parenting"]
    assert s4["has_naik_bb"] is True
    assert s4["naik_bb_overall_rate"] == 50.0
    assert len(s4["correlation_cells"]) == 16

    # Bagian 5: Faktor Ibu
    s5 = t_data["section5_maternal_factors"]
    assert s5["has_lila"] is True
    assert s5["kek_risk_rate"] == 50.0

    # B. Uji Tableau Filter Action dengan query ?desa_kelurahan=Lumban
    filtered_res = client.get("/api/dashboard/summary?desa_kelurahan=Lumban").json()
    f_t_data = filtered_res["tableau_analytics"]
    assert f_t_data["selected_desa_filter"] == "Lumban"

    # Bagian 1 pada desa Lumban hanya 2 balita (Anak 1 dan Anak 2)
    f_s1 = f_t_data["section1_birth_weight"]
    assert f_s1["total_valid"] == 2
    assert f_s1["bblr_count"] == 1  # Anak 2 (2.2 kg)
    assert f_s1["normal_count"] == 1  # Anak 1 (3.2 kg)

