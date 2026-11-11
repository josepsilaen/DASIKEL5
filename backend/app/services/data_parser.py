"""
Layanan pemrosesan, parsing, validasi kualitas data, dan deteksi PII
untuk file dataset balita (CSV dan Excel .xlsx).
Mematuhi prinsip keamanan: TIDAK mencatat data identitas pribadi ke log.
"""
import csv
import io
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import openpyxl

from app.schemas.data_management import (
    ColumnSummary,
    QualityIssue,
    StandardColumnDefinition,
    DatasetPreviewResponse,
    ValidateMappingResponse,
)

# Batas ukuran file yang diizinkan (15 Megabytes)
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
MAX_PREVIEW_ROWS = 100

# Definisi kolom standar acuan sistem Stunting Toba
STANDARD_COLUMNS: List[StandardColumnDefinition] = [
    StandardColumnDefinition(
        key="kecamatan",
        label="Kecamatan",
        description="Wilayah administratif kecamatan di Kabupaten Toba",
        category="administrative",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["kecamatan", "kec", "nama kecamatan", "distrik", "kec."],
    ),
    StandardColumnDefinition(
        key="puskesmas",
        label="Puskesmas",
        description="Nama fasilitas kesehatan tingkat pertama yang melayani pemantauan",
        category="administrative",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["puskesmas", "pukesmas", "pkm", "nama puskesmas", "puskesmas domisili", "faskes"],
    ),
    StandardColumnDefinition(
        key="desa_kelurahan",
        label="Desa / Kelurahan",
        description="Wilayah administratif domisili balita di Kabupaten Toba",
        category="administrative",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["desa/kel", "desa", "kelurahan", "desa_kel", "desa_kelurahan", "nama desa", "desa/kelurahan"],
    ),
    StandardColumnDefinition(
        key="posyandu",
        label="Posyandu",
        description="Nama Pos Pelayanan Terpadu tempat pengukuran dilakukan",
        category="administrative",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["posyandu", "nama posyandu", "pos", "nama_posyandu"],
    ),
    StandardColumnDefinition(
        key="usia_saat_ukur",
        label="Usia Saat Ukur",
        description="Usia anak dalam satuan bulan saat pengukuran antropometri dilakukan (rentang normal balita 0–60/72 bln)",
        category="core",
        is_required_for_stunting=True,
        expected_type="integer",
        unit="bulan",
        aliases=["usia saat ukur", "usia", "umur", "umur (bln)", "usia_bln", "umur_bulan", "usia_bulan", "usia (bulan)", "umur saat ukur"],
    ),
    StandardColumnDefinition(
        key="jenis_kelamin",
        label="Jenis Kelamin",
        description="Jenis kelamin balita (L = Laki-laki, P = Perempuan)",
        category="core",
        is_required_for_stunting=True,
        expected_type="string",
        aliases=["jenis kelamin", "jk", "sex", "gender", "j_kelamin", "jkel", "jenis_kelamin"],
    ),
    StandardColumnDefinition(
        key="berat_badan",
        label="Berat Badan",
        description="Berat badan balita hasil timbangan antropometri (dalam kilogram)",
        category="core",
        is_required_for_stunting=True,
        expected_type="float",
        unit="kg",
        aliases=["berat", "bb", "berat badan", "bb_kg", "berat_kg", "berat (kg)", "bb (kg)", "berat badan (kg)", "bobot"],
    ),
    StandardColumnDefinition(
        key="tinggi_badan",
        label="Tinggi / Panjang Badan",
        description="Panjang badan (anak < 2 th telentang) atau tinggi badan (anak >= 2 th berdiri) dalam sentimeter",
        category="core",
        is_required_for_stunting=True,
        expected_type="float",
        unit="cm",
        aliases=["tinggi", "tb", "tinggi badan", "tb_cm", "tinggi_cm", "tinggi (cm)", "tb (cm)", "panjang badan", "pb", "panjang (cm)", "panjang"],
    ),
    StandardColumnDefinition(
        key="status_tb_u",
        label="Status Gizi (TB/U)",
        description="Kategori status stunting berdasarkan indeks Tinggi Badan menurut Umur (misal: Sangat Pendek, Pendek, Normal, Tinggi)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["tb/u", "status tb/u", "status_tb_u", "kategori tb/u", "status stunting", "tb_u", "status gizi tb/u", "tbu", "kategori_tbu", "kategori tbu"],
    ),
    StandardColumnDefinition(
        key="zscore_tb_u",
        label="Z-Score (TB/U)",
        description="Nilai simpangan baku z-score baku WHO untuk indikator TB/U",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        aliases=["zs tb/u", "zscore tb/u", "z-score tb/u", "zs_tbu", "zscore_tbu", "z_score_tb_u", "zscore (tb/u)", "zs tbu", "zscore tbu"],
    ),
    StandardColumnDefinition(
        key="status_bb_u",
        label="Status Gizi (BB/U)",
        description="Kategori status berat badan menurut umur (misal: Berat Badan Sangat Kurang, Kurang, Normal, Risiko Lebih)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["bb/u", "status bb/u", "status_bb_u", "kategori bb/u", "status gizi bb/u", "bbu", "bb_u", "status bbu", "bb u"],
    ),
    StandardColumnDefinition(
        key="zscore_bb_u",
        label="Z-Score (BB/U)",
        description="Nilai simpangan baku z-score baku WHO untuk indikator BB/U",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        aliases=["zs bb/u", "zscore bb/u", "z-score bb/u", "zs_bbu", "zscore_bbu", "z_score_bb_u", "zscore (bb/u)", "zs bbu", "zs bb u"],
    ),
    StandardColumnDefinition(
        key="status_bb_tb",
        label="Status Gizi (BB/TB)",
        description="Kategori status wasting/akut berdasarkan Berat Badan menurut Tinggi Badan (misal: Gizi Buruk, Gizi Kurang, Gizi Baik, Berisiko Gizi Lebih, Gizi Lebih, Obesitas)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["bb/tb", "status bb/tb", "status_bb_tb", "kategori bb/tb", "status gizi bb/tb", "bbtb", "bb_tb", "status bbtb", "bb/pb", "status bb/pb", "bb tb"],
    ),
    StandardColumnDefinition(
        key="zscore_bb_tb",
        label="Z-Score (BB/TB)",
        description="Nilai simpangan baku z-score baku WHO untuk indikator BB/TB",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        aliases=["zs bb/tb", "zscore bb/tb", "z-score bb/tb", "zs_bbtb", "zscore_bbtb", "z_score_bb_tb", "zscore (bb/tb)", "zs bbtb", "zs bb/pb", "zscore bb/pb"],
    ),
    StandardColumnDefinition(
        key="berat_lahir",
        label="Berat Lahir (BBL)",
        description="Berat badan balita saat lahir (indikator riwayat BBLR jika < 2.5 kg)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        unit="kg",
        aliases=[
            "bb lahir", "berat lahir", "bbl", "bb_lahir", "berat badan lahir",
            "bbl (kg)", "bb lahir (kg)", "bb_lahir_kg", "bb lahir kg",
            "berat_lahir_kg", "berat lahir kg", "berat lahir (kg)", "berat_lahir (kg)"
        ],
    ),
    StandardColumnDefinition(
        key="tanggal_lahir",
        label="Tanggal Lahir",
        description="Tanggal lahir balita untuk verifikasi usia dan kohor kelahiran",
        category="core",
        is_required_for_stunting=False,
        expected_type="date",
        aliases=["tgl lahir", "tanggal lahir", "tgl_lahir", "tanggal_lahir", "tgl lahir anak", "tgl lahir balita", "dob", "birth date", "birthdate"],
    ),
    StandardColumnDefinition(
        key="panjang_lahir",
        label="Panjang Lahir (PBL)",
        description="Panjang badan saat lahir dalam satuan sentimeter",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        unit="cm",
        aliases=[
            "tb lahir", "panjang lahir", "pbl", "tb_lahir", "panjang badan lahir",
            "panjang lahir (cm)", "pb lahir", "pb_lahir", "pb_lahir_cm", "pb lahir cm",
            "tb_lahir_cm", "tb lahir cm", "panjang_lahir_cm", "panjang lahir cm"
        ],
    ),
    StandardColumnDefinition(
        key="indikator_bblr",
        label="Indikator BBLR",
        description="Status atau indikator riwayat Bayi Berat Lahir Rendah (1/0, Ya/Tidak)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=[
            "bblr", "status_bblr", "status bblr", "indikator_bblr", "indikator bblr",
            "riwayat_bblr", "riwayat bblr", "is_bblr", "bblr_flag"
        ],
    ),
    StandardColumnDefinition(
        key="indikator_pb_lahir",
        label="Indikator PB Lahir Pendek",
        description="Status atau indikator bayi lahir dengan panjang badan pendek (< 48 cm: 1/0, Ya/Tidak)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=[
            "pb_lahir_pendek", "pb lahir pendek", "indikator_pb_lahir", "indikator pb lahir",
            "status_pb_lahir", "status pb lahir"
        ],
    ),
    StandardColumnDefinition(
        key="cara_ukur",
        label="Cara Ukur",
        description="Metode pengukuran panjang/tinggi badan balita (Berdiri / Telentang)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["cara ukur", "cara_ukur", "posisi ukur", "posisi_ukur", "metode ukur", "cara pengukuran", "posisi"],
    ),
    StandardColumnDefinition(
        key="tanggal_ukur",
        label="Tanggal Pengukuran",
        description="Tanggal kegiatan penimbangan atau pengukuran balita",
        category="administrative",
        is_required_for_stunting=False,
        expected_type="date",
        aliases=["tgl ukur", "tanggal ukur", "tanggal pengukuran", "tgl_pengukuran", "tgl_ukur", "tgl penimbangan", "tanggal penimbangan"],
    ),
    StandardColumnDefinition(
        key="status_naik_berat_badan",
        label="Status Naik Berat Badan (KMS N/T/O/B)",
        description="Status kenaikan berat badan balita pada KMS (N = Naik, T = Tidak Naik, O = Tidak Ditimbang Bulan Lalu, B = Baru Pertama Timbang)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["naik bb", "status bb", "n/t/o/b", "status_naik_berat_badan", "status naik bb", "naik berat badan", "status timbang"],
    ),
    StandardColumnDefinition(
        key="kehadiran_posyandu",
        label="Kehadiran Posyandu",
        description="Frekuensi atau status kehadiran balita dalam kegiatan Posyandu",
        category="administrative",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["kehadiran posyandu", "hadir posyandu", "kehadiran", "presensi posyandu", "kunjungan posyandu"],
    ),
    StandardColumnDefinition(
        key="kelas_ibu_balita",
        label="Kelas Ibu Balita",
        description="Keikutsertaan ibu balita dalam program Kelas Ibu Balita (Ya / Tidak)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["kelas ibu", "kelas ibu balita", "ikut kelas ibu", "kelas_ibu_balita", "keikutsertaan kelas ibu"],
    ),
    StandardColumnDefinition(
        key="lila_ibu",
        label="LiLA Ibu (cm)",
        description="Ukuran lingkar lengan atas ibu hamil/menyusui dalam cm (indikator risiko KEK jika < 23.5 cm)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        unit="cm",
        aliases=["lila", "lila ibu", "lingkar lengan atas", "lila (cm)", "lila_ibu", "lingkar lengan", "lila_cm", "lila cm"],
    ),
    StandardColumnDefinition(
        key="status_lila",
        label="Status LiLA Ibu (KEK / Normal)",
        description="Status risiko Kurang Energi Kronis ibu berdasarkan LiLA (KEK < 23.5 cm / Normal)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["status lila", "kategori lila", "status_lila", "status kek", "status gizi ibu"],
    ),
]

logger = logging.getLogger("stunting_toba.pii")

# Entitas wilayah dan fasilitas administratif publik yang BUKAN data identitas pribadi
ADMIN_ENTITIES = {
    "posyandu", "puskesmas", "pkm", "faskes", "fasilitas",
    "desa", "kelurahan", "kecamatan", "distrik", "kabupaten", "kota", "provinsi"
}

# Kata kunci yang merujuk pada subjek/keluarga (identitas individu)
PERSON_KEYWORDS = {
    "anak", "balita", "bayi", "ibu", "ayah", "bapak", "ortu", "orangtua",
    "orang", "tua", "wali", "pasien", "sasaran", "subjek", "responden",
    "lengkap", "panggilan", "kecil", "kandung", "kepala", "kk", "keluarga",
    "murid", "siswa", "peserta", "pribadi"
}

# Daftar kata umum non-PII yang sering mengandung substring "wa", "hp", atau "kk"
# Digunakan untuk mencegah kesalahan deteksi (false positive)
FALSE_POSITIVE_WORDS = {
    "warna", "perawatan", "karyawan", "bawaan", "rawan", "riwayat",
    "waktu", "bawah", "dewasa", "tawar", "mawar", "hawa", "rawa",
    "lawan", "kawan", "kecewa", "dakwa", "fatwa", "jadwal", "bawang",
    "kawah", "mahasiswa", "tahap", "php", "pushup", "hakiki", "bengkulu"
}


def normalize_column_name(col_name: str) -> str:
    """
    Menormalisasi nama kolom dengan:
    1. Mengubah ke huruf kecil (lowercase) dan membuang spasi ujung.
    2. Mengganti semua tanda baca/karakter non-alfanumerik (_, -, /, ., (, ), [, ], :, dll) menjadi spasi.
    3. Merapikan rentetan spasi ganda menjadi spasi tunggal.
    """
    if not col_name:
        return ""
    text = col_name.strip().lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def compact_column_name(col_name: str) -> str:
    """Menghapus semua tanda baca dan spasi untuk memeriksa variasi gabungan kata (misal: nonik, nokk, nowa)."""
    if not col_name:
        return ""
    return re.sub(r"[^a-z0-9]", "", col_name.strip().lower())


def classify_pii_column(col_name: str) -> Tuple[bool, str, Optional[str], Optional[str]]:
    """
    Mengklasifikasikan kolom berdasarkan indikasi Personally Identifiable Information (PII).

    Mengembalikan tuple:
    - is_pii (bool): True jika kolom adalah PII terkonfirmasi ATAU mencurigakan (untuk perlindungan).
    - status (str): 'confirmed', 'suspicious', atau 'safe'.
    - category (Optional[str]): 'nik', 'kk', 'nama', 'alamat', 'kontak', 'identitas_lain', 'suspicious', atau None.
    - reason (Optional[str]): Penjelasan teknis kategori deteksi.
    """
    norm = normalize_column_name(col_name)
    compact = compact_column_name(col_name)
    tokens = norm.split()
    token_set = set(tokens)

    if not norm or not tokens:
        return False, "safe", None, None

    # 1. Pengecualian nama wilayah dan fasilitas administratif publik
    # Contoh: 'nama posyandu', 'nama puskesmas', 'nama desa', 'nama kecamatan'
    has_admin = any(t in ADMIN_ENTITIES for t in tokens)
    has_person = any(t in PERSON_KEYWORDS for t in tokens)
    if has_admin and not has_person:
        return False, "safe", None, None

    # 2. Pengecualian kata tunggal non-PII (False Positive Guard)
    # Contoh: 'warna' (bukan WhatsApp), 'tahap' (bukan HP), 'riwayat', 'perawatan'
    if len(tokens) == 1 and tokens[0] in FALSE_POSITIVE_WORDS:
        return False, "safe", None, None

    # 3. Pemeriksaan Tenaga Kesehatan / Kader / Enumerator (Suspicious PII)
    # Harus diperiksa sebelum nama generik agar tidak tertukar
    is_worker = any(t in token_set for t in {"kader", "petugas", "bidan", "pengukur", "enumerator"})
    if is_worker and not ("anak" in token_set or "balita" in token_set or "bayi" in token_set):
        return True, "suspicious", "suspicious", f"Kolom '{col_name}' terindikasi memuat nama tenaga lapangan/petugas (perlu pemeriksaan manual)."

    # 4. Email / Surel
    # Diperiksa sebelum alamat fisik agar 'Alamat Email' terdeteksi sebagai email/dokumen
    if any(t in token_set for t in {"email", "surel"}) or compact in {"email", "alamatemail"}:
        return True, "confirmed", "identitas_lain", "Alamat Email"

    # 5. Alamat Pribadi / Domisili / Tempat Tinggal
    # Diperiksa sebelum NIK agar kolom seperti 'Alamat KTP' dikategorikan sebagai alamat
    if (
        "alamat" in token_set
        or compact.startswith("alamat")
        or "tempat tinggal" in norm
        or compact in {"tempattinggal", "lokasitinggal"}
        or ("domisili" in token_set and not has_admin)
        or "rt rw" in norm
        or token_set == {"rt"}
        or token_set == {"rw"}
        or compact in {"rtrw", "rt", "rw", "nort", "norw"}
        or ("rt" in token_set and "rw" in token_set)
        or "no rumah" in norm
        or "nomor rumah" in norm
        or "nama jalan" in norm
    ):
        return True, "confirmed", "alamat", "Alamat tempat tinggal / domisili"

    # 6. NIK / No NIK / KTP
    # Mendeteksi variasi: NIK, No NIK, nonik, NO_NIK, nik_anak, No KTP, KTP, Nomor Induk Kependudukan
    if (
        "nik" in token_set or "nonik" in token_set or "ktp" in token_set or "noktp" in token_set
        or compact in {"nik", "nonik", "ktp", "noktp", "nomornik", "nomorktp"}
        or compact.startswith(("nonik", "noktp", "nomornik", "nomorktp"))
        or (compact.startswith("nik") and compact not in {"nikotin", "nikel"})
        or "nomor induk kependudukan" in norm
    ):
        return True, "confirmed", "nik", "Nomor Induk Kependudukan (NIK/KTP)"

    # 7. Kartu Keluarga (KK)
    # Mendeteksi variasi: Kartu Keluarga, No KK, No. KK, nokk, nomor_kk, no_kartu_keluarga, KK
    if (
        compact in {"kk", "nokk", "nomorkk", "norkk", "kartukeluarga", "nokartukeluarga", "nomorkartukeluarga"}
        or compact.startswith(("nokk", "nomorkk", "norkk", "kartukeluarga", "nokartukeluarga"))
        or "kartu keluarga" in norm
        or (token_set == {"kk"})
        or ("kk" in token_set and any(t in token_set for t in {"no", "nomor", "kartu", "keluarga", "anak", "ibu", "ayah", "ortu", "balita", "bayi"}))
    ):
        return True, "confirmed", "kk", "Nomor / Identitas Kartu Keluarga (KK)"

    # 8. Nama Pribadi (Nama Anak, Nama Orang Tua, Nama Lengkap)
    if (
        token_set == {"nama"}
        or ("nama" in token_set and has_person)
        or ("nama" in token_set and len(tokens) <= 3 and not has_admin)
        or "nama lengkap" in norm
        or "nama panggilan" in norm
        or "nama ortu" in norm
        or "nama orang tua" in norm
        or "ibu kandung" in norm
        or "ayah kandung" in norm
    ):
        return True, "confirmed", "nama", "Nama pribadi / subjek / keluarga"

    # 9. Kontak: Telepon / No HP / WhatsApp
    # WhatsApp (menangani: WhatsApp, No WA, nowa, nomor wa, No. WA)
    is_wa = (
        "whatsapp" in token_set or "whatapps" in token_set
        or compact in {"whatsapp", "nowhatsapp", "nomorwhatsapp", "wa", "nowa", "nomorwa"}
        or compact.startswith(("nowa", "nomorwa", "whatsapp"))
        or ("wa" in token_set and ("no" in token_set or "nomor" in token_set or has_person or "telp" in token_set or "hp" in token_set))
        or token_set == {"wa"}
    )
    # No HP / Handphone / Ponsel
    is_hp = (
        "hp" in token_set
        or compact in {"hp", "nohp", "nomorhp", "handphone", "nohandphone", "nomorhandphone", "ponsel", "noponsel"}
        or compact.startswith(("nohp", "nomorhp", "nohandphone", "nomorhandphone"))
        or "handphone" in token_set
        or "ponsel" in token_set
    )
    # Telepon
    is_telp = (
        any(t in token_set for t in {"telepon", "telp", "tlp", "telephone", "phone"})
        or compact in {"telepon", "telp", "tlp", "notelp", "notlp", "nomortelepon", "nomortelp", "telephone", "phone", "notelepon"}
        or compact.startswith(("notelp", "notlp", "nomortelepon", "nomortelp", "notelepon"))
    )
    # No Kontak
    is_kontak = (
        "kontak" in token_set and (any(t in token_set for t in {"no", "nomor", "hp", "wa", "telp"}) or has_person)
    )

    if is_wa or is_hp or is_telp or is_kontak:
        return True, "confirmed", "kontak", "Nomor Telepon / Handphone / WhatsApp"

    # 10. Dokumen / Identitas Resmi Lainnya (BPJS, KIS, Akta Lahir, Paspor)
    if (
        any(t in token_set for t in {"bpjs", "nobpjs", "kis", "nokis", "akta", "akte", "paspor", "passport", "nopaspor"})
        or compact in {"bpjs", "kis", "nobpjs", "nokis", "kartubpjs", "kartukis"}
        or compact.startswith(("noakta", "noakte", "nomorakta", "nomorakte", "akta", "akte", "paspor"))
        or "kartu indonesia sehat" in norm
        or "akta lahir" in norm or "akte lahir" in norm or "akta kelahiran" in norm or "no akta" in norm
    ):
        return True, "confirmed", "identitas_lain", "Nomor Identitas Resmi / Dokumen"

    # 10. Kolom Mencurigakan (Suspicious PII - Tandai untuk pemeriksaan manual)
    # Sesuai mandat: Jika nama kolom mencurigakan tetapi belum dapat dipastikan,
    # tandai untuk pemeriksaan manual dan jangan langsung menganggapnya aman.
    is_suspicious_id = (
        compact in {"id", "noid", "nomorid", "noidentitas", "nomoridentitas", "identitas", "dataidentitas", "subjek", "responden"}
        or "identitas" in token_set
        or "biodata" in token_set
        or "profil" in token_set
        or compact.startswith(("idanak", "idbalita", "idpasien", "idsubjek", "idibu", "idayah", "idkeluarga", "noidentitas"))
        or ("id" in token_set and has_person)
    )
    is_suspicious_parent = (
        tokens in [["ortu"], ["orang", "tua"], ["orangtua"], ["wali"], ["ibu"], ["ayah"], ["bapak"]]
    )
    is_suspicious_notes = (
        any(t in token_set for t in {"catatan", "keterangan"}) and has_person
    )
    is_standalone_kontak = (
        tokens == ["kontak"] or compact == "kontak"
    )
    is_suspicious_sublocation = (
        tokens in [["dusun"], ["lingkungan"], ["gang"], ["blok"]]
    )

    if (
        is_suspicious_id or is_suspicious_parent
        or is_suspicious_notes or is_standalone_kontak or is_suspicious_sublocation
    ):
        return (
            True,
            "suspicious",
            "suspicious",
            f"Kolom mencurigakan '{col_name}' terindikasi memuat data identitas atau catatan pribadi (perlu pemeriksaan manual).",
        )

    # 11. Aman (Bukan PII)
    return False, "safe", None, None


def is_pii_column(col_name: str) -> bool:
    """
    Mengecek apakah nama kolom terindikasi memuat data identitas pribadi (PII).
    Mengembalikan True baik untuk PII terkonfirmasi maupun kolom mencurigakan
    yang memerlukan pemeriksaan manual demi keamanan data.
    """
    is_pii, _, _, _ = classify_pii_column(col_name)
    return is_pii


def mask_pii_value(value: Any, col_name: str, category: Optional[str] = None) -> str:
    """
    Menyamarkan nilai identitas pribadi untuk pratinjau antarmuka.
    Memastikan tidak ada nilai PII mentah yang terpapar ke frontend atau log aplikasi.
    """
    if value is None or str(value).strip() in ("", "-", "nan", "none", "null", "nil"):
        return "-"

    val_str = str(value).strip()

    if not category:
        _, _, category, _ = classify_pii_column(col_name)

    cat = (category or "").lower()

    # 1. NIK, KTP, Kartu Keluarga, BPJS, Dokumen Registrasi
    if cat in ("nik", "kk", "identitas_lain"):
        if len(val_str) >= 10:
            return val_str[:6] + "******" + val_str[-2:]
        elif len(val_str) >= 6:
            return val_str[:3] + "******" + val_str[-1:]
        return "******"

    # 2. Nama Pribadi (Anak, Orang Tua, dsb)
    if cat == "nama":
        words = val_str.split()
        if words:
            masked_words = []
            for w in words:
                if len(w) > 1:
                    masked_words.append(w[0].upper() + "***")
                else:
                    masked_words.append("***")
            return " ".join(masked_words)
        return "***"

    # 3. Alamat / Domisili / Tempat Tinggal
    if cat == "alamat":
        return "Dusun/Jalan *** (Disamarkan)"

    # 4. Telepon / HP / WhatsApp
    if cat == "kontak":
        if len(val_str) >= 8:
            return val_str[:4] + "****" + val_str[-2:]
        elif len(val_str) >= 5:
            return val_str[:2] + "****" + val_str[-1:]
        return "08**********"

    # 5. Kolom mencurigakan atau fallback PII
    digits_only = re.sub(r"\D", "", val_str)
    if len(digits_only) >= 10:
        return digits_only[:4] + "******" + digits_only[-2:]
    elif " " in val_str:
        words = val_str.split()
        return " ".join([w[0].upper() + "***" if len(w) > 1 else "***" for w in words])
    elif len(val_str) > 2:
        return val_str[0] + "***" + val_str[-1]

    return "*** (Disamarkan)"


def normalize_text(text: str) -> str:
    """Membersihkan teks dan tanda baca untuk pencocokan alias kolom."""
    return re.sub(r"[\s_/\-\(\)\.]+", " ", text.strip().lower()).strip()


def mask_raw_text_pii(text: str) -> str:
    """
    Menyamarkan potensi Personally Identifiable Information (PII) dalam baris teks mentah
    (misalnya file satu kolom teks / laporan ekspor yang belum terurai).
    Mencegah kebocoran NIK (16 digit), nomor KK, nomor kontak, serta nama balita.
    """
    if not text or not text.strip():
        return text

    masked = text

    # 1. Samarkan NIK / No KK (16 digit angka berurutan)
    # Contoh: 1212010101230001 -> 121201******01
    masked = re.sub(
        r"\b(\d{6})\d{8}(\d{2})\b",
        r"\g<1>******\g<2>",
        masked,
    )

    # 2. Samarkan nomor kontak / HP (08xxxxxxxxxx)
    masked = re.sub(
        r"\b(08\d{2})\d{4,8}(\d{2})\b",
        r"\g<1>****\g<2>",
        masked,
    )

    # 3. Samarkan nomor identitas 10-18 digit lainnya
    masked = re.sub(
        r"\b(\d{4})\d{4,10}(\d{2})\b",
        r"\g<1>******\g<2>",
        masked,
    )

    # 3. Samarkan nama balita pada baris dengan NIK tersamar diikuti nama dan gender [LP]
    # Pola umum Puskesmas: <NIK_TERSAMAR> <NAMA_ANAK> <JK(L/P)>
    def _mask_name_match(match):
        nik_part = match.group(1)
        name_part = match.group(2).strip()
        jk_part = match.group(3)
        words = name_part.split()
        if words and all(len(w) >= 2 and w.isalpha() for w in words):
            masked_name = " ".join(w[0].upper() + "***" for w in words)
            return f"{nik_part}  {masked_name}  {jk_part}"
        return match.group(0)

    masked = re.sub(
        r"(\d{6}\*{6}\d{2})\s+([A-Za-z\s]{3,35})\s+([LP])\b",
        _mask_name_match,
        masked,
    )

    return masked


def find_suggested_mapping(col_name: str) -> Tuple[Optional[str], float]:
    """
    Mencari kandidat kolom standar yang paling cocok dengan nama kolom sumber.
    Menggunakan pendekatan bertingkat berbasis prioritas yang ketat:
    1. Filter PII dan kolom kosong/generik.
    2. Tingkat 1: Kecocokan persis pada key standar (confidence = 1.0).
    3. Tingkat 2: Kecocokan persis pada alias ternormalisasi / compact dengan guard pencegahan collision (confidence = 0.95).
    4. Tingkat 3: Kecocokan token/kata lengkap dengan proteksi singkatan pendek (confidence = 0.85).
    5. Tingkat 4: Substring berbasis batas kata (word boundary) hanya untuk alias deskriptif >= 4 karakter (confidence = 0.75).
    """
    # 1. Kolom PII (terkonfirmasi maupun mencurigakan) tidak boleh dipetakan otomatis ke kolom antropometri
    if is_pii_column(col_name):
        return None, 0.0

    raw_lower = col_name.strip().lower()
    # Jangan menghasilkan mapping otomatis dari kolom Unnamed, kolom generik, atau struktur tak teridentifikasi
    if (
        not raw_lower
        or raw_lower.startswith("unnamed")
        or raw_lower.startswith("kolom")
        or raw_lower.startswith("column")
        or raw_lower in {"data", "isi", "text", "teks", "baris", "row", "tabel", "table", "-", "none", "null", "undefined"}
    ):
        return None, 0.0

    norm_col = normalize_text(col_name)
    if not norm_col:
        return None, 0.0

    compact_col = re.sub(r"[^a-z0-9]", "", raw_lower)
    col_tokens = set(norm_col.split())

    # --- PENGAMAN DAN DISAMBIGUASI SEMANTIK (COLLISION GUARDS) ---
    # Membedakan: berat badan vs berat lahir vs BBLR vs tinggi badan vs panjang lahir
    is_birth_col = any(t in col_tokens for t in {"lahir", "birth", "bbl", "pbl"}) or "lahir" in compact_col
    is_bblr_flag = "bblr" in col_tokens or compact_col == "bblr" or "bblr" in compact_col
    is_pb_pendek_flag = "pendek" in col_tokens and is_birth_col
    is_clinical_status = any(t in col_tokens for t in {"status", "kategori", "zscore", "zs"})
    is_naik_weight = "naik" in col_tokens and ("bb" in col_tokens or "berat" in col_tokens)
    is_category_or_group = any(t in col_tokens for t in {"kelompok", "kategori", "grup", "group", "range", "rentang", "cohort", "kohor"})

    # Tingkat 1: Kecocokan persis pada key standar (confidence 1.0)
    for std in STANDARD_COLUMNS:
        norm_key = normalize_text(std.key)
        compact_key = re.sub(r"[^a-z0-9]", "", std.key)
        if norm_col == norm_key or compact_col == compact_key:
            return std.key, 1.0

    # Tingkat 2: Kecocokan persis pada alias ternormalisasi atau compact (confidence 0.95)
    for std in STANDARD_COLUMNS:
        # Aturan eksklusi agar tidak terjadi collision antarvariabel mirip
        if std.key == "berat_badan" and (is_birth_col or is_bblr_flag or is_clinical_status or is_naik_weight):
            continue
        if std.key == "tinggi_badan" and (is_birth_col or is_pb_pendek_flag or is_clinical_status):
            continue
        if std.key == "berat_lahir" and (is_bblr_flag and not ("berat" in col_tokens or "bb" in col_tokens)):
            continue
        if std.key == "panjang_lahir" and is_pb_pendek_flag:
            continue
        if std.key == "usia_saat_ukur" and is_category_or_group:
            continue

        for alias in std.aliases:
            norm_alias = normalize_text(alias)
            compact_alias = re.sub(r"[^a-z0-9]", "", alias.lower())
            if norm_col == norm_alias or compact_col == compact_alias:
                return std.key, 0.95

    # Tingkat 3: Kecocokan token/kata lengkap (confidence 0.85)
    best_match = None
    best_confidence = 0.0

    for std in STANDARD_COLUMNS:
        if std.key == "berat_badan" and (is_birth_col or is_bblr_flag or is_clinical_status or is_naik_weight):
            continue
        if std.key == "tinggi_badan" and (is_birth_col or is_pb_pendek_flag or is_clinical_status):
            continue
        if std.key == "berat_lahir" and (is_bblr_flag and not ("berat" in col_tokens or "bb" in col_tokens)):
            continue
        if std.key == "panjang_lahir" and is_pb_pendek_flag:
            continue
        if std.key == "usia_saat_ukur" and is_category_or_group:
            continue

        for alias in std.aliases:
            norm_alias = normalize_text(alias)
            alias_tokens = set(norm_alias.split())

            # Hindari token singkatan pendek (<=3 huruf seperti 'bb', 'tb', 'pb') cocok secara longgar
            if len(alias_tokens) == 1:
                token = list(alias_tokens)[0]
                if len(token) <= 3:
                    if col_tokens in [{token}, {token, "kg"}, {token, "cm"}, {token, "bln"}, {token, "bulan"}]:
                        return std.key, 0.90
                    continue

            # Jika semua token alias merupakan subset dari kata kolom sumber
            if alias_tokens.issubset(col_tokens):
                conf = 0.85
                if conf > best_confidence:
                    best_match = std.key
                    best_confidence = conf

    if best_match and best_confidence >= 0.70:
        return best_match, best_confidence

    # Tingkat 4: Substring berbasis batas kata (word boundary) hanya untuk alias deskriptif >= 4 karakter
    for std in STANDARD_COLUMNS:
        if std.key == "berat_badan" and (is_birth_col or is_bblr_flag or is_clinical_status or is_naik_weight):
            continue
        if std.key == "tinggi_badan" and (is_birth_col or is_pb_pendek_flag or is_clinical_status):
            continue
        if std.key == "berat_lahir" and (is_bblr_flag and not ("berat" in col_tokens or "bb" in col_tokens)):
            continue
        if std.key == "panjang_lahir" and is_pb_pendek_flag:
            continue
        if std.key == "usia_saat_ukur" and is_category_or_group:
            continue

        for alias in std.aliases:
            norm_alias = normalize_text(alias)
            if len(norm_alias) < 4:
                continue

            # Gunakan batas kata regex \b agar tidak mencocokkan substring di dalam kata lain
            pattern = r"\b" + re.escape(norm_alias) + r"\b"
            if re.search(pattern, norm_col):
                conf = 0.75
                if conf > best_confidence:
                    best_match = std.key
                    best_confidence = conf

    return best_match, best_confidence


def find_segmented_ruler(lines: List[str]) -> Optional[Tuple[int, List[Tuple[int, Optional[int]]]]]:
    """
    Mencari baris ruler/pembatas segmen kolom pada 15 baris pertama teks.
    Format ruler valid terdiri dari deretan dash (-) atau equals (=) yang dipisahkan oleh spasi.
    Contoh:
    '---  ----------------  -----------------  --  ----  ----'
    '===  ================  =================  ==  ====  ===='
    """
    for idx, line in enumerate(lines[:15]):
        stripped = line.strip()
        if not stripped or len(stripped) < 10:
            continue
        # Periksa apakah baris hanya memuat -, =, spasi, +, |
        if not re.match(r"^[-\s=+|]+$", stripped):
            continue

        # Temukan semua segmen dash/equals berurutan yang dipisahkan spasi
        segments = list(re.finditer(r"[-=]+", line))
        if len(segments) >= 3:
            spans: List[Tuple[int, Optional[int]]] = []
            for i in range(len(segments)):
                start = segments[i].start()
                if i < len(segments) - 1:
                    # Rentang kolom membentang hingga awal segmen berikutnya
                    end = segments[i + 1].start()
                else:
                    # Kolom terakhir membentang hingga akhir baris
                    end = None
                spans.append((start, end))
            return idx, spans
    return None


def validate_parsed_fixed_width(
    headers: List[str],
    rows: List[Dict[str, Any]],
) -> Tuple[bool, Optional[str]]:
    """
    Memvalidasi apakah hasil penguraian fixed-width konsisten secara struktural
    dan tidak mengalami pergeseran kolom (column drift).
    """
    if len(headers) < 3:
        return False, "Jumlah kolom teridentifikasi kurang dari 3."
    if not rows:
        return False, "Tidak ditemukan baris data setelah baris pembatas."

    # Periksa kolom gender / JK jika ada
    jk_cols = [
        h for h in headers
        if any(g in h.lower() for g in ("jk", "gender", "jenis kelamin"))
    ]
    for jc in jk_cols:
        non_empty = [r[jc].strip().upper() for r in rows if r[jc].strip()]
        if non_empty:
            valid_genders = {"L", "P", "LAKI-LAKI", "PEREMPUAN", "PRIA", "WANITA", "M", "F", "1", "2"}
            invalid_count = sum(1 for v in non_empty if v not in valid_genders)
            if invalid_count / len(non_empty) > 0.4:
                return False, f"Kolom gender '{jc}' memuat nilai tidak valid ({invalid_count}/{len(non_empty)})."

    # Periksa kolom numerik berat / tinggi / usia jika ada
    num_cols = [
        h for h in headers
        if any(k in h.lower() for k in ("berat", "bb", "tinggi", "tb", "panjang", "usia", "umur"))
    ]
    for nc in num_cols:
        non_empty = [r[nc].strip() for r in rows if r[nc].strip()]
        if non_empty:
            non_numeric = 0
            for val in non_empty:
                v_clean = val.replace(",", ".")
                try:
                    float(v_clean)
                except ValueError:
                    non_numeric += 1
            if non_numeric / len(non_empty) > 0.4:
                return False, f"Kolom antropometri/numerik '{nc}' memuat nilai non-numerik ({non_numeric}/{len(non_empty)})."

    # Periksa kelengkapan baris data (mencegah baris kosong atau phantom wrap)
    valid_row_count = 0
    for r in rows:
        filled = sum(1 for v in r.values() if v.strip())
        if filled >= 2:
            valid_row_count += 1

    if valid_row_count / len(rows) < 0.6:
        return False, "Mayoritas baris data kosong atau terpotong akibat ketidakselarasan fixed-width."

    return True, None


def try_parse_fixed_width(
    raw_lines: List[str],
) -> Optional[Tuple[List[str], List[Dict[str, Any]]]]:
    """
    Mencoba merekonstruksi format fixed-width / laporan ekspor dengan batas posisi
    kolom yang dapat dibuktikan secara matematis (menggunakan segmented ruler).
    Mendukung pengenalan header multi-baris di atas ruler.
    Mengembalikan (headers, rows) jika berhasil dan tervalidasi, atau None jika gagal.
    """
    clean_lines = []
    for l in raw_lines:
        s = l.strip()
        if not s:
            continue
        if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
            clean_lines.append(s[1:-1])
        else:
            clean_lines.append(l.rstrip())

    if not clean_lines:
        return None

    # Jika baris pertama adalah envelope "Data" atau '"Data"', gunakan baris di bawahnya
    first_stripped = clean_lines[0].strip().strip('"\'').lower()
    working_lines = clean_lines[1:] if first_stripped in ("data", "isi", "text", "teks") else clean_lines

    ruler_res = find_segmented_ruler(working_lines)
    if not ruler_res:
        return None

    ruler_idx, spans = ruler_res
    if ruler_idx == 0:
        # Tidak ada header sebelum ruler
        return None

    header_lines = working_lines[:ruler_idx]

    # Ekstraksi nama kolom dari header multi-baris secara posisi-spans
    raw_headers: List[str] = []
    for col_idx, (start, end) in enumerate(spans):
        col_tokens: List[str] = []
        for h_line in header_lines:
            val = h_line[start:end].strip() if start < len(h_line) else ""
            if val:
                col_tokens.append(val)
        if col_tokens:
            raw_headers.append(" ".join(col_tokens))
        else:
            raw_headers.append(f"Kolom_{col_idx + 1}")

    # Bersihkan duplikasi nama header
    headers: List[str] = []
    seen: Dict[str, int] = {}
    for h in raw_headers:
        cleaned = h.strip()
        if not cleaned:
            cleaned = "Kolom"
        if cleaned in seen:
            seen[cleaned] += 1
            headers.append(f"{cleaned}_{seen[cleaned]}")
        else:
            seen[cleaned] = 0
            headers.append(cleaned)

    # Ekstraksi baris data setelah ruler
    data_lines = working_lines[ruler_idx + 1:]
    rows: List[Dict[str, Any]] = []

    for d_line in data_lines:
        stripped = d_line.strip()
        # Lewati ruler sekunder, garis penutup, atau baris kosong
        if not stripped or re.match(r"^[-\s=+|]+$", stripped):
            continue
        # Lewati baris watermark/halaman cetak laporan
        if re.search(r"\b(halaman|page|dicetak|printed|subtotal|total)\b", stripped.lower()):
            continue

        row_dict: Dict[str, Any] = {}
        for col_idx, (start, end) in enumerate(spans):
            val = d_line[start:end].strip() if start < len(d_line) else ""
            row_dict[headers[col_idx]] = val
        rows.append(row_dict)

    if not rows:
        return None

    # Validasi kepastian data
    is_valid, _ = validate_parsed_fixed_width(headers, rows)
    if not is_valid:
        return None

    return headers, rows


def detect_data_type(values: List[Any]) -> str:
    """Mendeteksi tipe data umum dari sampel nilai dalam satu kolom."""
    non_empty = [v for v in values if v is not None and str(v).strip() not in ("", "nan", "none", "null", "-", "na")]
    if not non_empty:
        return "string"

    int_count = 0
    float_count = 0
    date_count = 0
    bool_count = 0
    sample_size = min(len(non_empty), 200)

    for v in non_empty[:sample_size]:
        s = str(v).strip()
        # Boolean check
        if s.lower() in ("true", "false", "ya", "tidak", "1", "0"):
            bool_count += 1
            continue

        # Date check
        try:
            if isinstance(v, datetime):
                date_count += 1
                continue
            if re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}$", s) or re.match(r"^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$", s):
                date_count += 1
                continue
        except Exception:
            pass

        # Numeric check (mendukung koma desimal Indonesia)
        s_num = s.replace(",", ".")
        try:
            val_f = float(s_num)
            if val_f.is_integer() and "." not in s_num:
                int_count += 1
            else:
                float_count += 1
            continue
        except ValueError:
            pass

    threshold = 0.75
    if int_count / sample_size >= threshold:
        return "integer"
    if (int_count + float_count) / sample_size >= threshold:
        return "float"
    if date_count / sample_size >= threshold:
        return "date"
    if bool_count / sample_size >= threshold and bool_count > 5:
        return "boolean"

    return "string"


def parse_csv_content_with_meta(content: bytes) -> Tuple[List[str], List[Dict[str, Any]], bool]:
    """
    Membaca isi file CSV dengan deteksi encoding, pembatas (delimiter),
    serta rekonstruksi format fixed-width / laporan ekspor jika memiliki batas yang terbukti.
    Mengembalikan: (clean_headers, rows, is_reconstructed_fixed_width)
    """
    encodings_to_try = ["utf-8-sig", "utf-8", "latin-1", "cp1252"]
    decoded_text = None

    for enc in encodings_to_try:
        try:
            decoded_text = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if decoded_text is None:
        raise ValueError("Encoding file tidak didukung. Harap simpan file sebagai UTF-8.")

    if not decoded_text.strip():
        raise ValueError("File CSV kosong tanpa isi.")

    lines = [line for line in decoded_text.splitlines() if line.strip()]
    if not lines:
        raise ValueError("File CSV tidak memiliki baris data yang valid.")

    # Deteksi delimiter otomatis
    sample_header = "\n".join(lines[:5])
    try:
        dialect = csv.Sniffer().sniff(sample_header, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except Exception:
        # Fallback jika sniffer ragu
        first_line = lines[0]
        if ";" in first_line and first_line.count(";") > first_line.count(","):
            delimiter = ";"
        elif "\t" in first_line:
            delimiter = "\t"
        else:
            delimiter = ","

    reader = csv.reader(io.StringIO(decoded_text), delimiter=delimiter)
    try:
        raw_headers = next(reader)
    except StopIteration:
        raise ValueError("File CSV tidak memiliki header baris pertama.")

    # Bersihkan header
    headers = [h.strip() for h in raw_headers if h is not None]
    if not headers or all(h == "" for h in headers):
        raise ValueError("Header baris pertama tidak valid atau kosong seluruhnya.")

    # Beri nama default untuk kolom tanpa nama (contoh: Unnamed_1)
    clean_headers = []
    seen = {}
    for idx, h in enumerate(raw_headers):
        clean_h = h.strip() if h else f"Unnamed_{idx + 1}"
        if not clean_h:
            clean_h = f"Unnamed_{idx + 1}"
        if clean_h in seen:
            seen[clean_h] += 1
            clean_h = f"{clean_h}_{seen[clean_h]}"
        else:
            seen[clean_h] = 0
        clean_headers.append(clean_h)

    rows = []
    for row in reader:
        # Lewati baris kosong
        if not row or all(str(cell).strip() == "" for cell in row):
            continue
        row_dict = {}
        for idx, col_name in enumerate(clean_headers):
            val = row[idx].strip() if idx < len(row) else ""
            row_dict[col_name] = val
        rows.append(row_dict)

    is_reconstructed_fw = False

    # PEMERIKSAAN KHUSUS: Apakah CSV hanya menghasilkan satu kolom teks (misalnya kolom 'Data' atau laporan teks)?
    if len(clean_headers) == 1:
        # Coba rekonstruksi fixed-width HANYA jika terdapat batas posisi kolom yang dapat dibuktikan
        # Gunakan lines langsung agar spasi posisi kolom di awal baris tetap terjaga utuh
        fw_result = try_parse_fixed_width(lines)
        if fw_result is not None:
            fw_headers, fw_rows = fw_result
            return fw_headers, fw_rows, True

        # Jika bukan fixed-width yang dapat dibuktikan, pertahankan format satu kolom
        if not rows and len(lines) > 1:
            for l in lines[1:]:
                rows.append({clean_headers[0]: l.strip()})

    if not rows:
        raise ValueError("File memuat header kolom, namun tidak terdapat baris data balita di dalamnya.")

    return clean_headers, rows, is_reconstructed_fw


def parse_csv_content(content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Membaca isi file CSV dengan deteksi encoding dan pembatas (delimiter)."""
    headers, rows, _ = parse_csv_content_with_meta(content)
    return headers, rows


def parse_excel_content(content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Membaca isi file Excel .xlsx dengan pustaka openpyxl."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise ValueError(f"Gagal membaca format Excel: File rusak atau bukan file .xlsx valid ({str(exc)}).")

    sheet = wb.active
    if sheet is None:
        raise ValueError("Buku kerja Excel tidak memiliki lembar kerja (sheet) aktif.")

    rows_iter = sheet.iter_rows(values_only=True)

    # Cari baris header pertama yang tidak kosong
    raw_headers = None
    for r in rows_iter:
        if r and any(cell is not None and str(cell).strip() != "" for cell in r):
            raw_headers = r
            break

    if raw_headers is None:
        raise ValueError("Lembar kerja Excel kosong tanpa header atau data.")

    clean_headers = []
    seen = {}
    for idx, h in enumerate(raw_headers):
        val_str = str(h).strip() if h is not None else f"Unnamed_{idx + 1}"
        if not val_str:
            val_str = f"Unnamed_{idx + 1}"
        if val_str in seen:
            seen[val_str] += 1
            val_str = f"{val_str}_{seen[val_str]}"
        else:
            seen[val_str] = 0
        clean_headers.append(val_str)

    rows = []
    for row in rows_iter:
        if not row or all(cell is None or str(cell).strip() == "" for cell in row):
            continue
        row_dict = {}
        for idx, col_name in enumerate(clean_headers):
            if idx < len(row):
                cell_val = row[idx]
                if isinstance(cell_val, datetime):
                    row_dict[col_name] = cell_val.strftime("%Y-%m-%d")
                elif cell_val is None:
                    row_dict[col_name] = ""
                else:
                    row_dict[col_name] = str(cell_val).strip()
            else:
                row_dict[col_name] = ""
        rows.append(row_dict)

    if not rows:
        raise ValueError("File Excel memiliki baris header, namun tidak memiliki baris data balita.")

    return clean_headers, rows


def inspect_dataset(
    filename: str,
    file_type: str,
    file_size_bytes: int,
    headers: List[str],
    rows: List[Dict[str, Any]],
    is_reconstructed_fixed_width: bool = False,
) -> DatasetPreviewResponse:
    """Melakukan analisis kualitas, pemetaan otomatis, validasi rentang, dan pembentukan pratinjau."""
    total_rows = len(rows)
    total_columns = len(headers)

    # Profiling tiap kolom
    columns_summary: List[ColumnSummary] = []
    quality_issues: List[QualityIssue] = []

    # Deteksi apakah berkas merupakan format CSV satu kolom / laporan ekspor yang tidak dapat direkonstruksi
    is_single_column_export = False
    if len(headers) == 1 and not is_reconstructed_fixed_width:
        single_h = headers[0]
        single_h_lower = single_h.strip().lower()
        sample_vals = [str(r.get(single_h, "")) for r in rows[:15]]
        has_space_gaps = any("  " in v for v in sample_vals)
        if (
            single_h_lower in ("data", "isi", "text", "teks", "raw", "laporan", "baris")
            or single_h_lower.startswith("unnamed")
            or has_space_gaps
            or len(single_h) > 35
        ):
            is_single_column_export = True

    if is_single_column_export:
        quality_issues.append(
            QualityIssue(
                issue_type="unsupported_structure",
                severity="error",
                column=headers[0],
                message=f"File CSV terdeteksi hanya memiliki satu kolom teks ('{headers[0]}') / format laporan hasil ekspor.",
                affected_rows_count=total_rows,
                details=(
                    f"Berkas ini tidak menggunakan format tabular CSV standar dengan pemisah kolom (koma atau titik koma). "
                    f"Isi tabel berupa teks spasi tetap (fixed-width) atau header multi-baris yang tidak dapat direkonstruksi "
                    f"secara andal tanpa risiko pergeseran data. Sistem tidak memecah teks berdasarkan spasi demi menjaga integritas data balita. "
                    f"Mohon unggah berkas Excel asli (.xlsx) dari Puskesmas atau simpan ulang sebagai file CSV tabular standar."
                ),
            )
        )
    elif is_reconstructed_fixed_width:
        quality_issues.append(
            QualityIssue(
                issue_type="fixed_width_reconstructed",
                severity="info",
                message="Format fixed-width / laporan ekspor berhasil direkonstruksi menjadi tabel terstruktur.",
                affected_rows_count=total_rows,
                details="Kolom-kolom berhasil dipisahkan menggunakan pembatas posisi kolom (segmented ruler) yang terverifikasi.",
            )
        )

    column_values: Dict[str, List[Any]] = {h: [] for h in headers}
    for r in rows:
        for h in headers:
            column_values[h].append(r.get(h, ""))

    # Deteksi baris duplikat identik (seluruh nilai kolom persis sama)
    seen_rows = set()
    identical_duplicates = 0
    for r in rows:
        row_tuple = tuple(str(r.get(h, "")).strip() for h in headers)
        if row_tuple in seen_rows:
            identical_duplicates += 1
        else:
            seen_rows.add(row_tuple)

    if identical_duplicates > 0:
        quality_issues.append(
            QualityIssue(
                issue_type="duplicates",
                severity="warning",
                message=f"Ditemukan {identical_duplicates} baris duplikat identik (seluruh kolom memiliki nilai persis sama).",
                affected_rows_count=identical_duplicates,
                details="Periksa apakah terjadi input ganda atau ekspor berulang pada dataset sumber.",
            )
        )

    # Deteksi kolom dan analisis tipe/nilai kosong
    mapped_standard_keys = set()
    for h in headers:
        vals = column_values[h]
        total_vals = len(vals)
        null_count = sum(1 for v in vals if v is None or str(v).strip() in ("", "-", "nan", "none", "null", "na", "n/a"))
        null_pct = round((null_count / total_vals * 100), 1) if total_vals > 0 else 0.0

        detected_type = detect_data_type(vals)
        is_pii, pii_status, pii_cat, pii_reason = classify_pii_column(h)

        # Ambil sampel nilai unik non-null (maksimal 5 sampel)
        sample_candidates = []
        for v in vals:
            if v is not None and str(v).strip() not in ("", "-", "nan", "none", "null", "nil"):
                if is_single_column_export:
                    masked = mask_raw_text_pii(str(v).strip())
                elif is_pii:
                    masked = mask_pii_value(v, h, category=pii_cat)
                else:
                    masked = str(v).strip()
                if masked not in sample_candidates:
                    sample_candidates.append(masked)
                if len(sample_candidates) >= 5:
                    break

        if is_single_column_export:
            suggested_key = None
            confidence = 0.0
        else:
            suggested_key, confidence = find_suggested_mapping(h)

        if suggested_key and confidence >= 0.70:
            mapped_standard_keys.add(suggested_key)

        columns_summary.append(
            ColumnSummary(
                name=h,
                detected_type=detected_type,
                total_count=total_vals,
                null_count=null_count,
                null_percentage=null_pct,
                sample_values=sample_candidates,
                is_pii=is_pii if not is_single_column_export else False,
                pii_status=pii_status if not is_single_column_export else "safe",
                pii_reason=pii_reason if not is_single_column_export else None,
                suggested_mapping=suggested_key if confidence >= 0.70 else None,
                mapping_confidence=confidence,
            )
        )

        # Catat isu jika kolom terindikasi mencurigakan untuk verifikasi manual pengguna
        if pii_status == "suspicious" and not is_single_column_export:
            quality_issues.append(
                QualityIssue(
                    issue_type="suspicious_pii",
                    severity="warning",
                    column=h,
                    message=f"Kolom '{h}' terindikasi berpotensi memuat identitas pribadi mencurigakan.",
                    affected_rows_count=total_vals,
                    details=(
                        f"{pii_reason} Sistem secara otomatis menyamarkan nilai kolom ini pada pratinjau "
                        "demi perlindungan privasi. Lakukan pemeriksaan manual untuk memastikan keamanannya."
                    ),
                )
            )

        # Catat isu nilai kosong jika melebihi ambang wajar
        if null_count > 0 and not is_single_column_export:
            severity = "warning" if null_pct > 25.0 else "info"
            quality_issues.append(
                QualityIssue(
                    issue_type="missing_values",
                    severity=severity,
                    column=h,
                    message=f"Kolom '{h}' memiliki {null_count} nilai kosong ({null_pct}% dari total baris).",
                    affected_rows_count=null_count,
                    details="Nilai kosong dapat memengaruhi akurasi agregasi atau model inferensi di tahap berikutnya.",
                )
            )

    # Validasi rentang nilai spesifik balita jika kolom terpetakan
    for col_summary in columns_summary:
        mapping = col_summary.suggested_mapping
        vals = column_values[col_summary.name]

        # Validasi Usia Balita (cakupan penelitian: 0 - 59 bulan)
        if mapping == "usia_saat_ukur":
            out_of_scope_age = 0
            invalid_age = 0
            for v in vals:
                try:
                    num = float(str(v).replace(",", "."))
                    if num < 0 or num > 120:
                        invalid_age += 1
                    elif num >= 60:
                        out_of_scope_age += 1
                except (ValueError, TypeError):
                    pass
            if out_of_scope_age > 0:
                quality_issues.append(
                    QualityIssue(
                        issue_type="out_of_scope_age",
                        severity="info",
                        column=col_summary.name,
                        message=f"Terdapat {out_of_scope_age} baris data dengan usia ≥ 60 bulan (di luar batasan usia balita 0–59 bulan).",
                        affected_rows_count=out_of_scope_age,
                        details="Sesuai definisi epidemiologis penelitian stunting, cakupan balita adalah 0–59 bulan. Data anak usia ≥ 60 bulan ditandai secara terpisah dan dipisahkan dari kohor balita 0–59 bulan.",
                    )
                )
            if invalid_age > 0:
                quality_issues.append(
                    QualityIssue(
                        issue_type="invalid_range",
                        severity="warning",
                        column=col_summary.name,
                        message=f"Terdapat {invalid_age} nilai usia tidak wajar (< 0 atau > 120 bulan).",
                        affected_rows_count=invalid_age,
                        details="Periksa kemungkinan kesalahan input nilai usia negatif atau salah satuan.",
                    )
                )

        # Validasi Berat Badan (normal: 1.0 - 35.0 kg)
        elif mapping == "berat_badan":
            invalid_bb = 0
            for v in vals:
                try:
                    num = float(str(v).replace(",", "."))
                    if num <= 0.5 or num > 40.0:
                        invalid_bb += 1
                except (ValueError, TypeError):
                    pass
            if invalid_bb > 0:
                quality_issues.append(
                    QualityIssue(
                        issue_type="invalid_range",
                        severity="warning",
                        column=col_summary.name,
                        message=f"Terdapat {invalid_bb} nilai berat badan di luar rentang klinis balita wajar (1.0–40.0 kg).",
                        affected_rows_count=invalid_bb,
                        details="Pastikan satuan pengukuran adalah kilogram (kg), bukan gram.",
                    )
                )

        # Validasi Tinggi Badan (normal: 30.0 - 135.0 cm)
        elif mapping == "tinggi_badan":
            invalid_tb = 0
            for v in vals:
                try:
                    num = float(str(v).replace(",", "."))
                    if num <= 25.0 or num > 145.0:
                        invalid_tb += 1
                except (ValueError, TypeError):
                    pass
            if invalid_tb > 0:
                quality_issues.append(
                    QualityIssue(
                        issue_type="invalid_range",
                        severity="warning",
                        column=col_summary.name,
                        message=f"Terdapat {invalid_tb} nilai tinggi/panjang badan di luar rentang balita wajar (30.0–140.0 cm).",
                        affected_rows_count=invalid_tb,
                        details="Pastikan satuan pengukuran adalah sentimeter (cm), bukan meter.",
                    )
                )

    # Evaluasi kesiapan dataset untuk analisis stunting
    required_keys = {"usia_saat_ukur", "jenis_kelamin", "tinggi_badan", "berat_badan"}
    missing_required = required_keys - mapped_standard_keys

    if is_single_column_export:
        readiness_status = "belum_lengkap"
        readiness_message = (
            f"Berkas CSV hanya memuat satu kolom teks ('{headers[0]}') dari laporan ekspor yang tidak dapat direkonstruksi secara andal. "
            "Silakan unggah berkas Excel asli (.xlsx) dari Puskesmas atau berkas CSV tabular dengan pemisah koma/titik koma standar."
        )
    elif not missing_required:
        readiness_status = "siap_analisis"
        readiness_message = (
            "Seluruh variabel antropometri inti (Usia, Jenis Kelamin, Berat, Tinggi Badan) berhasil teridentifikasi. "
            "Dataset memenuhi kelengkapan struktur dasar untuk analisis stunting."
        )
    elif len(missing_required) <= 2:
        readiness_status = "perlu_perhatian"
        missing_labels = [s.label for s in STANDARD_COLUMNS if s.key in missing_required]
        readiness_message = (
            f"Dataset memuat beberapa data penting, namun {len(missing_required)} kolom inti belum terpetakan otomatis: "
            f"{', '.join(missing_labels)}. Silakan konfirmasi pemetaan kolom."
        )
        quality_issues.insert(
            0,
            QualityIssue(
                issue_type="unmapped",
                severity="warning",
                message=f"Kolom wajib belum terpetakan: {', '.join(missing_labels)}.",
                details="Gunakan bagian Pemetaan Kolom untuk mengarahkan kolom sumber ke nama standar.",
            ),
        )
    else:
        readiness_status = "belum_lengkap"
        missing_labels = [s.label for s in STANDARD_COLUMNS if s.key in missing_required]
        readiness_message = (
            f"Dataset belum siap untuk analisis stunting. Terdapat {len(missing_required)} kolom inti yang belum terpetakan: "
            f"{', '.join(missing_labels)}."
        )
        quality_issues.insert(
            0,
            QualityIssue(
                issue_type="unmapped",
                severity="error",
                message="Sebagian besar variabel penentu status gizi belum ditemukan pada dataset.",
                details="Pastikan file yang diunggah memuat data antropometri balita.",
            ),
        )

    # Buat baris pratinjau dengan data PII tersamar secara default
    preview_rows = []
    for r in rows[:MAX_PREVIEW_ROWS]:
        preview_r = {}
        for h in headers:
            raw_val = r.get(h, "")
            is_pii, _, pii_cat, _ = classify_pii_column(h)
            if is_single_column_export:
                preview_r[h] = mask_raw_text_pii(str(raw_val))
            elif is_pii:
                preview_r[h] = mask_pii_value(raw_val, h, category=pii_cat)
            else:
                preview_r[h] = raw_val
        preview_rows.append(preview_r)

    # Catat audit log tanpa memuat nilai identitas pribadi mentah
    logger.info(
        "Inspeksi dataset '%s' selesai: %d baris, %d kolom. Kolom PII teridentifikasi: %s (suspicious: %s)",
        filename,
        total_rows,
        total_columns,
        [c.name for c in columns_summary if c.is_pii],
        [c.name for c in columns_summary if c.pii_status == "suspicious"],
    )

    return DatasetPreviewResponse(
        filename=filename,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        total_rows=total_rows,
        total_columns=total_columns,
        columns=columns_summary,
        standard_columns=STANDARD_COLUMNS,
        quality_issues=quality_issues,
        identical_duplicates_count=identical_duplicates,
        potential_repeat_measurements_count=0,
        readiness_status=readiness_status,
        readiness_message=readiness_message,
        preview_rows=preview_rows,
    )


def validate_custom_mapping(
    column_mapping: Dict[str, str],
) -> ValidateMappingResponse:
    """Memvalidasi konfigurasi pemetaan kolom yang disesuaikan oleh pengguna."""
    mapped_keys = set(column_mapping.values())
    required_keys = {"usia_saat_ukur", "jenis_kelamin", "tinggi_badan", "berat_badan"}
    missing_required = [k for k in required_keys if k not in mapped_keys]

    issues: List[QualityIssue] = []

    if not missing_required:
        is_valid = True
        readiness_status = "siap_analisis"
        readiness_message = "Pemetaan kolom lengkap. Variabel inti stunting (Usia, Jenis Kelamin, TB, BB) siap dianalisis."
    elif len(missing_required) <= 2:
        is_valid = False
        readiness_status = "perlu_perhatian"
        missing_names = [s.label for s in STANDARD_COLUMNS if s.key in missing_required]
        readiness_message = f"Pemetaan belum lengkap. Variabel inti yang belum terpetakan: {', '.join(missing_names)}."
        issues.append(
            QualityIssue(
                issue_type="unmapped",
                severity="warning",
                message=f"Kolom wajib belum terpetakan: {', '.join(missing_names)}",
                details="Lengkapi pemetaan agar analisis antropometri dan faktor risiko dapat dijalankan akurat.",
            )
        )
    else:
        is_valid = False
        readiness_status = "belum_lengkap"
        missing_names = [s.label for s in STANDARD_COLUMNS if s.key in missing_required]
        readiness_message = f"Dataset belum memenuhi syarat analisis. Belum ada pemetaan untuk: {', '.join(missing_names)}."
        issues.append(
            QualityIssue(
                issue_type="unmapped",
                severity="error",
                message="Mayoritas kolom inti stunting belum dipetakan.",
                details="Pilih kolom sumber yang sesuai pada formulir pemetaan.",
            )
        )

    return ValidateMappingResponse(
        is_valid=is_valid,
        mapped_columns_count=len(column_mapping),
        missing_required_columns=missing_required,
        readiness_status=readiness_status,
        readiness_message=readiness_message,
        issues=issues,
    )
