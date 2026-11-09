"""
Unit test komprehensif untuk penguatan deteksi dan perlindungan PII
(Personally Identifiable Information) pada modul Manajemen Data Balita:
- Variasi nama kolom identitas (NIK, Nama, Alamat, Kontak/HP/WA, KK)
- Normalisasi tanda baca, spasi, kapitalisasi, dan underscore
- Pencegahan false positive (warna, perawatan, tahap, nama posyandu, dsb.)
- Penandaan kolom mencurigakan (suspicious PII) untuk pemeriksaan manual
- Penyamaran nilai PII pada pratinjau API dan sampel nilai
- Larangan pemetaan otomatis kolom PII ke variabel klinis
"""
import io
import csv
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.services.data_parser import (
    normalize_column_name,
    compact_column_name,
    classify_pii_column,
    is_pii_column,
    mask_pii_value,
    find_suggested_mapping,
)

client = TestClient(app)


# ------------------ 1. Test Normalisasi Kolom ------------------

def test_normalization_casing_and_delimiters():
    """Memastikan normalisasi menangani huruf besar/kecil, spasi, underscore, strip, dan tanda kurung."""
    assert normalize_column_name("  NO_NIK  ") == "no nik"
    assert normalize_column_name("No. NIK") == "no nik"
    assert normalize_column_name("NIK-Anak (KTP)") == "nik anak ktp"
    assert normalize_column_name("nama_orang_tua") == "nama orang tua"
    assert normalize_column_name("No. HP / WA") == "no hp wa"
    assert normalize_column_name("Alamat/Domisili") == "alamat domisili"
    assert normalize_column_name("KARTU_KELUARGA") == "kartu keluarga"

    assert compact_column_name("No. NIK") == "nonik"
    assert compact_column_name("No_KK") == "nokk"
    assert compact_column_name("No-WA") == "nowa"
    assert compact_column_name("Alamat Domisili") == "alamatdomisili"


# ------------------ 2. Test Variasi NIK / KTP ------------------

@pytest.mark.parametrize("col_name", [
    "NIK",
    "No NIK",
    "nonik",
    "NO_NIK",
    "No. NIK",
    "no-nik",
    "nik_anak",
    "NIK Balita",
    "NIK Ibu",
    "NIK Ayah",
    "NIK Orang Tua",
    "NIK Ortu",
    "Nomor Induk Kependudukan",
    "No KTP",
    "Nomor KTP",
    "KTP",
    "noktp",
])
def test_nik_variations_detected(col_name: str):
    """Seluruh variasi penulisan kolom NIK/KTP harus terdeteksi sebagai PII terkonfirmasi."""
    is_pii, status, category, _ = classify_pii_column(col_name)
    assert is_pii is True
    assert status == "confirmed"
    assert category == "nik"
    assert is_pii_column(col_name) is True


# ------------------ 3. Test Variasi Nama Pribadi ------------------

@pytest.mark.parametrize("col_name", [
    "Nama",
    "Nama Anak",
    "Nama Balita",
    "Nama Bayi",
    "Nama Orang Tua",
    "Nama Ortu",
    "Nama Orangtua",
    "Nama Ibu",
    "Nama Ayah",
    "Nama Wali",
    "Nama Lengkap",
    "Nama Panggilan",
    "Nama Sasaran",
    "Nama Pasien",
    "nama_balita",
    "NAMA_ANAK",
    "Nama Anak Balita",
    "Ibu Kandung",
    "Ayah Kandung",
])
def test_nama_variations_detected(col_name: str):
    """Seluruh variasi penulisan nama pribadi harus terdeteksi sebagai PII terkonfirmasi."""
    is_pii, status, category, _ = classify_pii_column(col_name)
    assert is_pii is True
    assert status == "confirmed"
    assert category == "nama"
    assert is_pii_column(col_name) is True


# ------------------ 4. Test Variasi Alamat ------------------

@pytest.mark.parametrize("col_name", [
    "Alamat",
    "Alamat Rumah",
    "Alamat Domisili",
    "Alamat Lengkap",
    "Alamat Tinggal",
    "Alamat KTP",
    "Alamat Tempat Tinggal",
    "Tempat Tinggal",
    "RT/RW",
    "rt_rw",
    "RT",
    "RW",
    "No Rumah",
    "Nomor Rumah",
    "Nama Jalan",
])
def test_alamat_variations_detected(col_name: str):
    """Seluruh variasi penulisan alamat rumah/domisili harus terdeteksi sebagai PII terkonfirmasi."""
    is_pii, status, category, _ = classify_pii_column(col_name)
    assert is_pii is True
    assert status == "confirmed"
    assert category == "alamat"
    assert is_pii_column(col_name) is True


# ------------------ 5. Test Variasi Kontak (HP / Telepon / WhatsApp) ------------------

@pytest.mark.parametrize("col_name", [
    "No HP",
    "Nomor HP",
    "Handphone",
    "No Handphone",
    "No. HP",
    "no_hp",
    "nohp",
    "HP Ortu",
    "HP Ibu",
    "Nomor Telepon",
    "No Telepon",
    "No. Telp",
    "Telepon",
    "Telp",
    "notelp",
    "WhatsApp",
    "No WA",
    "No. WA",
    "nowa",
    "nomor wa",
    "No WhatsApp",
    "Nomor WhatsApp",
    "WA Ortu",
    "WA Ibu",
    "no telp / wa",
    "No Kontak",
    "Kontak Ortu",
])
def test_kontak_variations_detected(col_name: str):
    """Seluruh variasi penulisan nomor kontak (HP, Telp, WA) harus terdeteksi sebagai PII terkonfirmasi."""
    is_pii, status, category, _ = classify_pii_column(col_name)
    assert is_pii is True
    assert status == "confirmed"
    assert category == "kontak"
    assert is_pii_column(col_name) is True


# ------------------ 6. Test Variasi Kartu Keluarga & Dokumen Lainnya ------------------

@pytest.mark.parametrize("col_name", [
    "Kartu Keluarga",
    "No KK",
    "No. KK",
    "nokk",
    "nomor_kk",
    "no_kartu_keluarga",
    "nomor kartu keluarga",
    "KK",
    "Kartu_Keluarga",
])
def test_kk_variations_detected(col_name: str):
    """Seluruh variasi penulisan Kartu Keluarga (KK) harus terdeteksi sebagai PII terkonfirmasi."""
    is_pii, status, category, _ = classify_pii_column(col_name)
    assert is_pii is True
    assert status == "confirmed"
    assert category == "kk"
    assert is_pii_column(col_name) is True


@pytest.mark.parametrize("col_name", [
    "BPJS",
    "No BPJS",
    "KIS",
    "No KIS",
    "Akta Lahir",
    "No Akta",
    "Email",
    "Alamat Email",
])
def test_other_official_identifiers_detected(col_name: str):
    """Dokumen dan nomor identitas resmi lainnya harus terdeteksi sebagai PII terkonfirmasi."""
    is_pii, status, category, _ = classify_pii_column(col_name)
    assert is_pii is True
    assert status == "confirmed"
    assert category == "identitas_lain"


# ------------------ 7. Test Pencegahan Kasus False Positive ------------------

@pytest.mark.parametrize("col_name", [
    "warna",                 # Mengandung substring 'wa', namun bukan WhatsApp
    "perawatan",             # Mengandung substring 'wa', namun bukan WhatsApp
    "bawaan",                # Mengandung substring 'wa', namun bukan WhatsApp
    "kategori_taraf_rawan",   # Mengandung substring 'wa', namun bukan WhatsApp
    "riwayat_penyakit",      # Mengandung substring 'wa', namun bukan WhatsApp
    "waktu",                 # Mengandung substring 'wa', namun bukan WhatsApp
    "tahap",                 # Mengandung substring 'hp', namun bukan Handphone
    "php",                   # Mengandung substring 'hp', namun bukan Handphone
    "hakiki",                # Mengandung substring 'kk', namun bukan Kartu Keluarga
    "nama posyandu",         # Nama fasilitas administratif, bukan identitas pribadi
    "nama puskesmas",        # Nama fasilitas administratif, bukan identitas pribadi
    "nama desa",             # Nama wilayah administratif, bukan identitas pribadi
    "nama kelurahan",        # Nama wilayah administratif, bukan identitas pribadi
    "nama kecamatan",        # Nama wilayah administratif, bukan identitas pribadi
    "nama faskes",           # Nama fasilitas faskes, bukan identitas pribadi
    "posyandu",
    "puskesmas",
    "kecamatan",
    "desa",
    "kelurahan",
    "berat_badan",
    "tinggi_badan",
    "usia_saat_ukur",
    "jenis_kelamin",
    "status_tb_u",
    "zscore_tb_u",
    "status_bb_u",
    "status_bb_tb",
])
def test_false_positives_prevented(col_name: str):
    """Kolom non-PII dan metadata administratif TIDAK boleh keliru dideteksi sebagai PII."""
    is_pii, status, category, _ = classify_pii_column(col_name)
    assert is_pii is False, f"Kolom '{col_name}' keliru dideteksi sebagai PII ({category})"
    assert status == "safe"
    assert is_pii_column(col_name) is False


# ------------------ 8. Test Kolom Mencurigakan (Suspicious PII) ------------------

@pytest.mark.parametrize("col_name", [
    "identitas",
    "id_anak",
    "id_balita",
    "kontak",
    "keterangan ortu",
    "catatan balita",
    "nama kader",
    "nama petugas",
    "nama bidan",
    "petugas",
    "kader",
    "biodata",
    "profil",
])
def test_suspicious_columns_flagged_for_manual_review(col_name: str):
    """
    Jika nama kolom mencurigakan tetapi belum dapat dipastikan,
    sistem HARUS menandainya untuk pemeriksaan manual dan TIDAK menganggapnya aman (is_pii = True).
    """
    is_pii, status, category, reason = classify_pii_column(col_name)
    assert is_pii is True, f"Kolom mencurigakan '{col_name}' harus dilindungi (is_pii=True)"
    assert status == "suspicious"
    assert category == "suspicious"
    assert reason is not None
    assert is_pii_column(col_name) is True


# ------------------ 9. Test Masking Nilai PII ------------------

def test_mask_pii_value_logic():
    """Memverifikasi penyamaran nilai identitas pribadi untuk berbagai kategori."""
    # NIK & KK (16 digit angka)
    assert mask_pii_value("1209012304200001", "NIK") == "120901******01"
    assert mask_pii_value("1209012304200001", "nonik") == "120901******01"
    assert mask_pii_value("1209012304200002", "No KK") == "120901******02"

    # Nama pribadi
    assert mask_pii_value("Budi Santoso", "Nama Balita") == "B*** S***"
    assert mask_pii_value("Siti Aminah", "Nama Orang Tua") == "S*** A***"
    assert mask_pii_value("Michael", "Nama Anak") == "M***"

    # Alamat
    assert mask_pii_value("Jl. Sisingamangaraja No 45 Balige", "Alamat Domisili") == "Dusun/Jalan *** (Disamarkan)"

    # Kontak / HP / WhatsApp
    assert mask_pii_value("081234567890", "No HP") == "0812****90"
    assert mask_pii_value("082198765432", "WhatsApp") == "0821****32"
    assert mask_pii_value("081122334455", "Nomor Telepon") == "0811****55"

    # Kolom mencurigakan (harus tetap tersamar)
    assert mask_pii_value("Kader Siti", "nama kader") == "K*** S***"
    assert mask_pii_value("Catatan Rahasia Ortu", "keterangan ortu") == "C*** R*** O***"

    # Nilai kosong
    assert mask_pii_value(None, "NIK") == "-"
    assert mask_pii_value("", "Nama") == "-"
    assert mask_pii_value("-", "Alamat") == "-"


# ------------------ 10. Test Larangan Pemetaan Kolom PII ------------------

def test_pii_columns_not_suggested_for_standard_mapping():
    """Kolom yang terindikasi PII tidak boleh dipetakan otomatis ke kolom standar klinis/antropometri."""
    pii_samples = ["NIK", "nonik", "Nama Anak", "Nama Orang Tua", "Alamat", "No HP", "WhatsApp", "No KK"]
    for col in pii_samples:
        key, confidence = find_suggested_mapping(col)
        assert key is None
        assert confidence == 0.0


# ------------------ 11. Test Integrasi Upload Preview API ------------------

def test_upload_preview_masks_pii_and_flags_suspicious():
    """
    Pengujian endpoint /api/data/upload-preview:
    - Nilai PII tersamar pada preview_rows dan sample_values
    - Kolom mencurigakan menghasilkan QualityIssue jenis suspicious_pii
    - Kolom false positive (warna, tahap, nama posyandu) tetap aman dan tidak tersamar
    """
    headers = [
        "nonik",
        "Nama Anak",
        "Nama Orang Tua",
        "Alamat Domisili",
        "WhatsApp",
        "No KK",
        "keterangan ortu",
        "warna",
        "tahap",
        "nama posyandu",
        "Usia Saat Ukur",
        "Jenis Kelamin",
        "Berat Badan",
        "Tinggi Badan",
    ]
    rows = [
        [
            "1209012304200001",
            "Anak Fiktif Satu",
            "Orang Tua Fiktif",
            "Jl. Sisingamangaraja No 1",
            "081234567890",
            "1209012304200099",
            "Catatan Khusus",
            "Merah",
            "Tahap 1",
            "Posyandu Melati",
            "24",
            "L",
            "11.5",
            "86.2",
        ]
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    csv_bytes = output.getvalue().encode("utf-8")

    response = client.post(
        "/api/data/upload-preview",
        files={"file": ("test_pii_dataset.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()

    # 1. Verifikasi preview_rows tidak memuat nilai PII mentah
    preview_row = data["preview_rows"][0]

    # NIK tersamar
    assert "1209012304200001" not in preview_row["nonik"]
    assert "120901******01" in preview_row["nonik"]

    # Nama tersamar
    assert "Anak Fiktif Satu" not in preview_row["Nama Anak"]
    assert "A*** F*** S***" in preview_row["Nama Anak"]

    # Nama Orang Tua tersamar
    assert "Orang Tua Fiktif" not in preview_row["Nama Orang Tua"]
    assert "O*** T*** F***" in preview_row["Nama Orang Tua"]

    # Alamat tersamar
    assert "Jl. Sisingamangaraja No 1" not in preview_row["Alamat Domisili"]
    assert "Disamarkan" in preview_row["Alamat Domisili"]

    # WhatsApp tersamar
    assert "081234567890" not in preview_row["WhatsApp"]
    assert "0812****90" in preview_row["WhatsApp"]

    # No KK tersamar
    assert "1209012304200099" not in preview_row["No KK"]
    assert "120901******99" in preview_row["No KK"]

    # Kolom mencurigakan tersamar
    assert "Catatan Khusus" not in preview_row["keterangan ortu"]

    # 2. Verifikasi kolom non-PII TIDAK tersamar
    assert preview_row["warna"] == "Merah"
    assert preview_row["tahap"] == "Tahap 1"
    assert preview_row["nama posyandu"] == "Posyandu Melati"

    # 3. Verifikasi kolom summary
    cols_map = {c["name"]: c for c in data["columns"]}
    assert cols_map["nonik"]["is_pii"] is True
    assert cols_map["nonik"]["pii_status"] == "confirmed"

    assert cols_map["warna"]["is_pii"] is False
    assert cols_map["warna"]["pii_status"] == "safe"

    assert cols_map["tahap"]["is_pii"] is False
    assert cols_map["nama posyandu"]["is_pii"] is False

    assert cols_map["keterangan ortu"]["is_pii"] is True
    assert cols_map["keterangan ortu"]["pii_status"] == "suspicious"

    # 4. Verifikasi isu kualitas untuk kolom mencurigakan
    suspicious_issues = [
        iss for iss in data["quality_issues"] if iss["issue_type"] == "suspicious_pii"
    ]
    assert len(suspicious_issues) >= 1
    assert any(iss["column"] == "keterangan ortu" for iss in suspicious_issues)

