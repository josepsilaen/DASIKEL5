"""
Pengujian komprehensif untuk Data Ingestion Engine:
- Deteksi berkas CSV satu kolom teks / format laporan ekspor
- Rekonstruksi fixed-width hanya jika memiliki batas kolom yang terbukti (segmented ruler)
- Pengenalan dan penggabungan header multi-baris (multi-row header)
- Pencegahan pemecahan teks sembarangan berdasarkan spasi (nama majemuk balita & wilayah utuh)
- Pencegahan auto-mapping pada kolom Unnamed atau 'Data' generik
- Peringatan profesional (QualityIssue) saat format tidak dapat direkonstruksi secara andal
- Perlindungan PII pada data inspeksi dan pratinjau teks mentah
"""
import io
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.services.data_parser import find_suggested_mapping, mask_raw_text_pii

client = TestClient(app)


# ------------------ 1. Test Single Column Text & Unreliable Format ------------------

def test_single_column_unparseable_csv_triggers_warning_and_masks_pii():
    """
    Jika file CSV hanya memuat satu kolom teks 'Data' tanpa batas posisi kolom yang dapat
    dibuktikan (tanpa segmented ruler), sistem TIDAK memecah teks berdasarkan spasi,
    menampilkan peringatan terstruktur, dan melindungi PII pada pratinjau.
    """
    # Fixture sintetis tanpa ruler terbukti (teks laporan dengan spasi variabel)
    content = (
        'Data\n'
        '"Laporan Hasil Pengukuran Puskesmas Balige Tahun 2024"\n'
        '"No   NIK               Nama Balita        JK   Nama Ortu       Berat  Tinggi"\n'
        '"1    1212010101230001  ANISA MAHARANI     P    BUDI SANTOSO    9.2    74.5"\n'
        '"2    1212010202230002  JOSUA SIMANJUNTAK  L    HOTMAN MANURUNG 8.8    71.0"\n'
    ).encode("utf-8")

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("laporan_balita_ekspor.csv", content, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    # Struktur tetap satu kolom teks asli tanpa pemotongan sembarangan
    assert data["total_columns"] == 1
    assert data["columns"][0]["name"] == "Data"
    # Tidak boleh ada auto-mapping pada kolom Data generik
    assert data["columns"][0]["suggested_mapping"] is None

    # Status kesiapan belum lengkap karena struktur laporan tidak tabular
    assert data["readiness_status"] == "belum_lengkap"
    assert "tidak dapat direkonstruksi secara andal" in data["readiness_message"]

    # Harus memuat isu kualitas unsupported_structure dengan severity error
    issues = data["quality_issues"]
    structure_issues = [i for i in issues if i["issue_type"] == "unsupported_structure"]
    assert len(structure_issues) >= 1
    assert structure_issues[0]["severity"] == "error"
    assert "Excel asli (.xlsx)" in structure_issues[0]["details"]

    # Verifikasi perlindungan PII: NIK 16 digit pada pratinjau baris wajib tersamar
    preview_rows = data["preview_rows"]
    assert len(preview_rows) >= 3
    # Periksa bahwa tidak ada NIK 16 digit mentah yang bocor
    for pr in preview_rows:
        val_str = pr["Data"]
        assert "1212010101230001" not in val_str
        assert "1212010202230002" not in val_str
        # Jika baris memuat NIK sintetis, harus disamarkan dengan tanda bintang
        if "ANISA" in val_str or "JOSUA" in val_str:
            assert "121201******" in val_str


# ------------------ 2. Test Fixed-Width Reconstruction with Segmented Ruler ------------------

def test_fixed_width_with_segmented_ruler_reconstruction():
    """
    Jika file fixed-width memiliki segmented ruler yang membuktikan batas kolom secara matematis,
    sistem berhasil merekonstruksi menjadi tabel multi-kolom terstruktur tanpa memecah spasi nama.
    """
    content = (
        'Data\n'
        'No   NIK               Nama Balita        JK  Nama Ortu       Berat  Tinggi  Desa\n'
        '---  ----------------  -----------------  --  --------------  -----  ------  -----------\n'
        '1    1212010101230001  ANISA MAHARANI     P   BUDI SANTOSO    9.2    74.5    Balige III \n'
        '2    1212010202230002  JOSUA SIMANJUNTAK  L   HOTMAN MANURUNG 8.8    71.0    Bonan Dolok\n'
    ).encode("utf-8")

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("fixed_width_valid.csv", content, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    # Berhasil direkonstruksi menjadi 8 kolom
    assert data["total_columns"] == 8
    col_names = [c["name"] for c in data["columns"]]
    assert "No" in col_names
    assert "NIK" in col_names
    assert "Nama Balita" in col_names
    assert "JK" in col_names
    assert "Nama Ortu" in col_names
    assert "Berat" in col_names
    assert "Tinggi" in col_names

    # Verifikasi bahwa nama dengan spasi TIDAK terpecah sembarangan
    preview_rows = data["preview_rows"]
    assert len(preview_rows) == 2

    # Nama Balita dan Nama Ortu tersamar secara proporsional atau utuh per kolom
    assert "Desa" in preview_rows[0]
    assert preview_rows[0]["Desa"] == "Balige III"
    assert preview_rows[1]["Desa"] == "Bonan Dolok"

    # Kolom numerik memiliki nilai yang tepat tanpa pergeseran
    assert preview_rows[0]["Berat"] == "9.2"
    assert preview_rows[0]["Tinggi"] == "74.5"
    assert preview_rows[1]["Berat"] == "8.8"
    assert preview_rows[1]["Tinggi"] == "71.0"

    # Auto-mapping bekerja pada kolom hasil rekonstruksi
    col_mappings = {c["name"]: c["suggested_mapping"] for c in data["columns"]}
    assert col_mappings["Berat"] == "berat_badan"
    assert col_mappings["Tinggi"] == "tinggi_badan"
    assert col_mappings["JK"] == "jenis_kelamin"


# ------------------ 3. Test Multi-Row Header Recognition ------------------

def test_multi_row_header_combination():
    """
    Menguji bahwa header multi-baris (misal 'BB' di baris 1 dan 'Lahir' di baris 2)
    digabungkan secara cerdas menjadi 'BB Lahir' dan dipetakan ke 'berat_lahir'.
    """
    content = (
        'Data\n'
        'No   NIK               Nama Balita        JK  BB    TB    Usia Saat\n'
        '                                              Lahir Lahir Ukur     \n'
        '---  ----------------  -----------------  --  ----- ----- ---------\n'
        '1    1212010101230001  KARTIKA SARI       P   3.2   49.5  14       \n'
        '2    1212010202230002  DANIEL TOBING      L   3.4   50.0  12       \n'
    ).encode("utf-8")

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("multi_row_header.csv", content, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    col_names = [c["name"] for c in data["columns"]]
    assert "BB Lahir" in col_names
    assert "TB Lahir" in col_names
    assert "Usia Saat Ukur" in col_names

    col_mappings = {c["name"]: c["suggested_mapping"] for c in data["columns"]}
    assert col_mappings["BB Lahir"] == "berat_lahir"
    assert col_mappings["TB Lahir"] == "panjang_lahir"
    assert col_mappings["Usia Saat Ukur"] == "usia_saat_ukur"


# ------------------ 4. Test Prevention of Auto-Mapping on Unnamed/Generic Columns ------------------

def test_find_suggested_mapping_guards():
    """
    Memastikan kolom 'Unnamed', 'Data', 'Kolom_1', atau sejenisnya TIDAK PERNAH
    menghasilkan mapping otomatis ke kolom standar antropometri.
    """
    assert find_suggested_mapping("Data") == (None, 0.0)
    assert find_suggested_mapping("data") == (None, 0.0)
    assert find_suggested_mapping("Unnamed_1") == (None, 0.0)
    assert find_suggested_mapping("Unnamed: 0") == (None, 0.0)
    assert find_suggested_mapping("unnamed_5") == (None, 0.0)
    assert find_suggested_mapping("Kolom_3") == (None, 0.0)
    assert find_suggested_mapping("kolom") == (None, 0.0)
    assert find_suggested_mapping("text") == (None, 0.0)
    assert find_suggested_mapping("-") == (None, 0.0)
    assert find_suggested_mapping("") == (None, 0.0)


# ------------------ 5. Test Raw Text PII Masking Helper ------------------

def test_mask_raw_text_pii():
    """
    Memverifikasi bahwa fungsi penyamaran teks mentah menyamarkan NIK 16 digit,
    nomor telepon, dan nama balita dalam teks satu kolom tanpa pemisahan kolom.
    """
    raw_line = "1    1212010101230001  ANISA MAHARANI     P    081234567890"
    masked = mask_raw_text_pii(raw_line)

    assert "1212010101230001" not in masked
    assert "121201******01" in masked
    assert "0812****90" in masked
    assert "A*** M***" in masked


# ------------------ 6. Test Unreliable Column Drift Rejection ------------------

def test_unreliable_fixed_width_drift_rejected():
    """
    Jika sebuah file menyerupai fixed-width namun mengalami pergeseran kolom parah
    (misal teks nama balita bocor ke kolom gender atau angka berat), validasi fixed-width
    menolak penguraian dan tetap mempertahankan satu kolom dengan pesan peringatan yang aman.
    """
    # Format rusak: kolom JK diisi angka NIK, dan kolom berat diisi nama
    corrupted_content = (
        'Data\n'
        'No   JK   Berat\n'
        '---  ---  -----\n'
        '1    121  ANISA\n'
        '2    345  BUDI \n'
        '3    678  JOSUA\n'
    ).encode("utf-8")

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("corrupted_table.csv", corrupted_content, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    # Karena data tidak konsisten/kolom bergeser, fixed-width parsing ditolak
    assert data["total_columns"] == 1
    assert data["readiness_status"] == "belum_lengkap"
