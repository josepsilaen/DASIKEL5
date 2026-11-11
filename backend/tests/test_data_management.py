"""
Pengujian komprehensif untuk modul Manajemen Data Balita:
- Unggah file CSV valid
- Unggah file Excel (.xlsx) valid
- File kosong dan file rusak
- Format file tidak didukung
- Header kosong/rusak
- Deteksi duplikasi dan nilai kosong
- Pemetaan kolom standar
- Verifikasi keamanan: Penyamaran nilai PII
"""
import io
import csv
import pytest
import openpyxl
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_synthetic_csv_bytes(
    headers: list,
    rows: list,
    delimiter: str = ",",
) -> bytes:
    """Helper untuk membuat berkas CSV sintetis in-memory."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=delimiter)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    return output.getvalue().encode("utf-8")


def create_synthetic_excel_bytes(
    headers: list,
    rows: list,
) -> bytes:
    """Helper untuk membuat berkas Excel .xlsx sintetis in-memory."""
    wb = openpyxl.Workbook()
    ws = wb.active
    assert ws is not None
    ws.title = "Data Balita"
    ws.append(headers)
    for r in rows:
        ws.append(r)
    stream = io.BytesIO()
    wb.save(stream)
    return stream.getvalue()


# ------------------ 1. Test Valid CSV Upload ------------------

def test_upload_valid_csv():
    headers = ["Nama Balita", "NIK", "Usia Saat Ukur", "Jenis Kelamin", "Berat", "Tinggi", "Desa/Kel", "Pukesmas"]
    rows = [
        ["Anak Fiktif 1", "1209012304200001", "24", "L", "11.2", "85.4", "Balige III", "Balige"],
        ["Anak Fiktif 2", "1209012304200002", "18", "P", "9.5", "78.2", "Laguboti", "Laguboti"],
        ["Anak Fiktif 3", "1209012304200003", "36", "L", "13.1", "92.0", "Porsea", "Porsea"],
    ]
    csv_bytes = create_synthetic_csv_bytes(headers, rows)

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("balita_valid.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["filename"] == "balita_valid.csv"
    assert data["file_type"] == "csv"
    assert data["total_rows"] == 3
    assert data["total_columns"] == 8
    assert data["readiness_status"] == "siap_analisis"

    # Verifikasi kolom terdeteksi dan pemetaan otomatis
    col_mappings = {c["name"]: c["suggested_mapping"] for c in data["columns"]}
    assert col_mappings["Usia Saat Ukur"] == "usia_saat_ukur"
    assert col_mappings["Jenis Kelamin"] == "jenis_kelamin"
    assert col_mappings["Berat"] == "berat_badan"
    assert col_mappings["Tinggi"] == "tinggi_badan"
    assert col_mappings["Desa/Kel"] == "desa_kelurahan"
    assert col_mappings["Pukesmas"] == "puskesmas"


# ------------------ 2. Test Valid Excel .xlsx Upload ------------------

def test_upload_valid_excel():
    headers = ["Puskesmas", "Desa", "Umur", "JK", "BB", "TB"]
    rows = [
        ["Ajibata", "Pardamean Sibisa", 12, "P", 8.4, 72.1],
        ["Ajibata", "Motung", 20, "L", 10.1, 80.5],
    ]
    excel_bytes = create_synthetic_excel_bytes(headers, rows)

    response = client.post(
        "/api/data/upload-preview",
        files={
            "file": (
                "balita_data.xlsx",
                excel_bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["file_type"] == "xlsx"
    assert data["total_rows"] == 2
    assert data["total_columns"] == 6
    assert data["readiness_status"] == "siap_analisis"


# ------------------ 3. Test Empty & Corrupted Files ------------------

def test_upload_empty_file():
    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400
    assert "kosong" in response.json()["detail"].lower()


def test_upload_corrupted_excel():
    corrupted_bytes = b"PK\x03\x04This is not a real zip or excel file"
    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("broken.xlsx", corrupted_bytes, "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "rusak" in response.json()["detail"].lower() or "gagal" in response.json()["detail"].lower()


# ------------------ 4. Test Unsupported File Format ------------------

def test_upload_unsupported_format():
    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("laporan.pdf", b"%PDF-1.4 dummy", "application/pdf")},
    )
    assert response.status_code == 400
    assert "tidak didukung" in response.json()["detail"].lower()


# ------------------ 5. Test Empty / Invalid Header ------------------

def test_upload_csv_no_headers():
    csv_bytes = b"\n\n\n"
    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("no_header.csv", csv_bytes, "text/csv")},
    )
    assert response.status_code == 400


# ------------------ 6. Test Duplicates & Missing Values ------------------

def test_upload_csv_with_duplicates_and_nulls():
    headers = ["Puskesmas", "Usia", "JK", "BB", "TB"]
    rows = [
        ["Balige", "24", "L", "10.5", "84.0"],
        ["Balige", "24", "L", "10.5", "84.0"],  # duplikat identik
        ["Balige", "", "P", "9.0", ""],          # nilai kosong pada Usia dan TB
    ]
    csv_bytes = create_synthetic_csv_bytes(headers, rows)

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("duplikat_null.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["identical_duplicates_count"] == 1
    # Pastikan isu duplikat tercatat pada quality_issues
    issues = data["quality_issues"]
    assert any(i["issue_type"] == "duplicates" for i in issues)

    # Cek persentase null pada kolom Usia
    col_usia = next(c for c in data["columns"] if c["name"] == "Usia")
    assert col_usia["null_count"] == 1


# ------------------ 7. Test Out-of-Range Numeric Values ------------------

def test_upload_csv_out_of_range_values():
    headers = ["Usia Saat Ukur", "Jenis Kelamin", "Berat", "Tinggi"]
    rows = [
        ["120", "L", "80.0", "220.0"],  # Nilai tidak realistis untuk balita
        ["24", "P", "-5.0", "15.0"],
    ]
    csv_bytes = create_synthetic_csv_bytes(headers, rows)

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("outliers.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()
    issues = data["quality_issues"]
    range_issues = [i for i in issues if i["issue_type"] == "invalid_range"]
    assert len(range_issues) > 0


# ------------------ 8. Test Privacy (PII Masking) ------------------

def test_pii_masking_in_preview():
    headers = ["NIK", "Nama Balita", "Nama Orang Tua", "Alamat", "Usia", "JK", "BB", "TB"]
    rows = [
        ["1209012304200001", "Budi Santoso", "Siti Aminah", "Jl. Sutomo No 12", "12", "L", "9.0", "75.0"],
    ]
    csv_bytes = create_synthetic_csv_bytes(headers, rows)

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("pii_test.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    preview_row = data["preview_rows"][0]
    # NIK tidak boleh muncul lengkap
    assert "1209012304200001" != preview_row["NIK"]
    assert "******" in preview_row["NIK"]

    # Nama tidak boleh tampil penuh
    assert "Budi Santoso" != preview_row["Nama Balita"]
    assert "***" in preview_row["Nama Balita"]

    # Alamat harus tersamar
    assert "Jl. Sutomo No 12" != preview_row["Alamat"]
    assert "Disamarkan" in preview_row["Alamat"] or "***" in preview_row["Alamat"]


# ------------------ 9. Test Column Mapping Validation Endpoint ------------------

def test_validate_mapping_endpoint():
    # Pemetaan lengkap
    valid_payload = {
        "column_mapping": {
            "Umur": "usia_saat_ukur",
            "Gender": "jenis_kelamin",
            "Panjang": "tinggi_badan",
            "Bobot": "berat_badan",
        }
    }
    res_valid = client.post("/api/data/validate-mapping", json=valid_payload)
    assert res_valid.status_code == 200
    assert res_valid.json()["is_valid"] is True
    assert res_valid.json()["readiness_status"] == "siap_analisis"

    # Pemetaan tidak lengkap (kurang tinggi badan dan jenis kelamin)
    incomplete_payload = {
        "column_mapping": {
            "Umur": "usia_saat_ukur",
            "Bobot": "berat_badan",
        }
    }
    res_incomplete = client.post("/api/data/validate-mapping", json=incomplete_payload)
    assert res_incomplete.status_code == 200
    assert res_incomplete.json()["is_valid"] is False
    assert len(res_incomplete.json()["missing_required_columns"]) > 0


# ------------------ 10. Test Standard Columns Endpoint ------------------

def test_get_standard_columns():
    res = client.get("/api/data/standard-columns")
    assert res.status_code == 200
    cols = res.json()
    assert len(cols) >= 8
    keys = [c["key"] for c in cols]
    assert "usia_saat_ukur" in keys
    assert "jenis_kelamin" in keys
    assert "berat_badan" in keys
    assert "tinggi_badan" in keys
    assert "tanggal_lahir" in keys
    assert "cara_ukur" in keys
    assert "tanggal_ukur" in keys


# ------------------ 11. Test Actual Reference Dataset 12 Columns Mapping ------------------

def test_reference_dataset_columns_mapping():
    """
    Menguji bahwa 12 kolom dari dataset aktual terpetakan secara tepat:
    - JK -> jenis_kelamin
    - Tgl Lahir -> tanggal_lahir (BUKAN tanggal_ukur)
    - BB Lahir -> berat_lahir
    - TB Lahir -> panjang_lahir
    - Kec -> kecamatan
    - Pukesmas -> puskesmas
    - Desa/Kel -> desa_kelurahan
    - Posyandu -> posyandu
    - Usia Saat Ukur -> usia_saat_ukur
    - Tanggal Pengukuran -> tanggal_ukur
    - Berat -> berat_badan
    - Tinggi -> tinggi_badan
    - Cara Ukur -> cara_ukur
    """
    from app.services.data_parser import find_suggested_mapping

    reference_cases = {
        "JK": "jenis_kelamin",
        "Tgl Lahir": "tanggal_lahir",
        "BB Lahir": "berat_lahir",
        "TB Lahir": "panjang_lahir",
        "Kec": "kecamatan",
        "Pukesmas": "puskesmas",
        "Desa/Kel": "desa_kelurahan",
        "Posyandu": "posyandu",
        "Usia Saat Ukur": "usia_saat_ukur",
        "Tanggal Pengukuran": "tanggal_ukur",
        "Berat": "berat_badan",
        "Tinggi": "tinggi_badan",
        "Cara Ukur": "cara_ukur",
    }

    for col_name, expected_key in reference_cases.items():
        mapped_key, conf = find_suggested_mapping(col_name)
        assert mapped_key == expected_key, f"Kolom '{col_name}' dipetakan ke '{mapped_key}', seharusnya '{expected_key}'"
        assert conf >= 0.90, f"Confidence kolom '{col_name}' kurang tinggi: {conf}"


# ------------------ 12. Test Out-of-Scope Age (>=60 months) Quality Profiling ------------------

def test_out_of_scope_age_quality_profiling():
    headers = ["Usia Saat Ukur", "Jenis Kelamin", "Berat", "Tinggi"]
    rows = [
        ["24", "L", "11.0", "85.0"],
        ["65", "P", "18.0", "110.0"],  # Anak >= 60 bulan (di luar cakupan balita 0-59 bln)
        ["70", "L", "19.5", "112.0"],  # Anak >= 60 bulan
    ]
    csv_bytes = create_synthetic_csv_bytes(headers, rows)

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("out_of_scope_age.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()
    issues = data["quality_issues"]
    out_of_scope_issues = [i for i in issues if i["issue_type"] == "out_of_scope_age"]
    assert len(out_of_scope_issues) == 1
    assert out_of_scope_issues[0]["affected_rows_count"] == 2
    assert "≥ 60 bulan" in out_of_scope_issues[0]["message"]


# ------------------ 13. Test Auto-Mapping Collision Prevention (BBLR vs Antropometri) ------------------

def test_bblr_never_mapped_to_berat_badan():
    """
    Memastikan bahwa kolom 'bblr' dan variasinya TIDAK PERNAH terpetakan sebagai 'berat_badan'.
    Sebaliknya harus terpetakan ke 'indikator_bblr'.
    """
    from app.services.data_parser import find_suggested_mapping

    bblr_variations = ["bblr", "BBLR", "status_bblr", "indikator_bblr", "riwayat_bblr", "is_bblr"]
    for col in bblr_variations:
        target, conf = find_suggested_mapping(col)
        assert target != "berat_badan", f"Kolom '{col}' salah terpetakan sebagai berat_badan!"
        assert target == "indikator_bblr", f"Kolom '{col}' seharusnya terpetakan ke indikator_bblr, didapat: {target}"
        assert conf >= 0.90, f"Confidence '{col}' kurang tinggi: {conf}"


def test_anthropometry_and_birth_factors_collision_free_mapping():
    """
    Memastikan tidak ada collision antara variabel berat badan, berat lahir, indikator BBLR,
    tinggi badan, dan panjang lahir.
    """
    from app.services.data_parser import find_suggested_mapping

    expected_mappings = {
        "berat_kg": "berat_badan",
        "tinggi_cm": "tinggi_badan",
        "pb_lahir_cm": "panjang_lahir",
        "bb_lahir_kg": "berat_lahir",
        "bblr": "indikator_bblr",
        "pb_lahir_pendek": "indikator_pb_lahir",
        "naik_bb": "status_naik_berat_badan",
        "bb": "berat_badan",
        "tb": "tinggi_badan",
        "usia_bulan": "usia_saat_ukur",
        "lila_cm": "lila_ibu",
    }

    for col_name, expected_std in expected_mappings.items():
        mapped, conf = find_suggested_mapping(col_name)
        assert mapped == expected_std, f"Kolom '{col_name}' dipetakan ke '{mapped}', seharusnya '{expected_std}'"
        assert conf >= 0.90, f"Confidence '{col_name}' terlalu rendah: {conf}"

    # Verifikasi negatif khusus
    pb_target, _ = find_suggested_mapping("pb_lahir_cm")
    assert pb_target != "tinggi_badan", "pb_lahir_cm tidak boleh dipetakan ke tinggi_badan!"

    bbl_target, _ = find_suggested_mapping("bb_lahir_kg")
    assert bbl_target != "berat_badan", "bb_lahir_kg tidak boleh dipetakan ke berat_badan!"


def test_similar_columns_dataset_upload_preview():
    """
    Menguji upload dataset sintetis dengan nama-nama kolom mirip untuk memastikan auto-mapping
    dan pemetaan kolom aktif tidak tertukar atau collision.
    """
    headers = [
        "Usia_Bulan", "Jenis_Kelamin", "Berat_Kg", "Tinggi_Cm",
        "BB_Lahir_Kg", "PB_Lahir_Cm", "BBLR", "PB_Lahir_Pendek", "Naik_BB"
    ]
    rows = [
        ["12", "L", "9.5", "75.2", "3.1", "49.0", "0", "0", "N"],
        ["24", "P", "11.0", "84.5", "2.3", "46.0", "1", "1", "T"],
    ]
    csv_bytes = create_synthetic_csv_bytes(headers, rows)

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("similar_cols.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["readiness_status"] == "siap_analisis"

    mappings = {c["name"]: c["suggested_mapping"] for c in data["columns"]}
    assert mappings["Berat_Kg"] == "berat_badan"
    assert mappings["Tinggi_Cm"] == "tinggi_badan"
    assert mappings["BBLR"] == "indikator_bblr"
    assert mappings["PB_Lahir_Cm"] == "panjang_lahir"
    assert mappings["BB_Lahir_Kg"] == "berat_lahir"
    assert mappings["PB_Lahir_Pendek"] == "indikator_pb_lahir"
    assert mappings["Naik_BB"] == "status_naik_berat_badan"


def test_actual_dummy_dataset_dashboard_kpi_100_percent_valid():
    """
    Menguji dataset aktual 'dataset_dummy_stunting_bersih.csv' untuk memastikan bahwa
    setelah perbaikan auto-mapping, KPI Dashboard menampilkan 2.340 data valid (100%).
    """
    import os
    actual_path = r"D:\SEMESTER 5\DALISDASI\dataset_dummy_stunting_bersih.csv"
    if not os.path.exists(actual_path):
        pytest.skip("Dataset aktual tidak ditemukan pada path lokal.")

    with open(actual_path, "rb") as f:
        file_bytes = f.read()

    # Unggah dataset melalui API endpoint
    upload_res = client.post(
        "/api/data/upload-preview",
        files={"file": ("dataset_dummy_stunting_bersih.csv", file_bytes, "text/csv")},
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["readiness_status"] == "siap_analisis"

    # Periksa KPI Dashboard melalui API endpoint
    dash_res = client.get("/api/dashboard/summary")
    assert dash_res.status_code == 200
    summary = dash_res.json()

    assert summary["has_active_dataset"] is True
    assert summary["total_records"] == 2340
    assert summary["valid_records"] == 2340
    assert summary["need_check_records"] == 0
    assert summary["valid_percentage"] == 100.0
    assert summary["need_check_percentage"] == 0.0
    assert summary["out_of_range_count"] == 0

