"""
Layanan pemrosesan, parsing, validasi kualitas data, dan deteksi PII
untuk file dataset balita (CSV dan Excel .xlsx).
Mematuhi prinsip keamanan: TIDAK mencatat data identitas pribadi ke log.
"""
import csv
import io
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
        aliases=["berat", "bb", "berat badan", "bb_kg", "berat_kg", "berat (kg)", "bb (kg)", "berat badan (kg)"],
    ),
    StandardColumnDefinition(
        key="tinggi_badan",
        label="Tinggi / Panjang Badan",
        description="Panjang badan (anak < 2 th telentang) atau tinggi badan (anak >= 2 th berdiri) dalam sentimeter",
        category="core",
        is_required_for_stunting=True,
        expected_type="float",
        unit="cm",
        aliases=["tinggi", "tb", "tinggi badan", "tb_cm", "tinggi_cm", "tinggi (cm)", "tb (cm)", "panjang badan", "pb", "panjang (cm)"],
    ),
    StandardColumnDefinition(
        key="status_tb_u",
        label="Status Gizi (TB/U)",
        description="Kategori status stunting berdasarkan indeks Tinggi Badan menurut Umur (misal: Sangat Pendek, Pendek, Normal, Tinggi)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="string",
        aliases=["tb/u", "status tb/u", "status_tb_u", "kategori tb/u", "status stunting", "tb_u", "status gizi tb/u", "tbu"],
    ),
    StandardColumnDefinition(
        key="zscore_tb_u",
        label="Z-Score (TB/U)",
        description="Nilai simpangan baku z-score baku WHO untuk indikator TB/U",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        aliases=["zs tb/u", "zscore tb/u", "z-score tb/u", "zs_tbu", "zscore_tbu", "z_score_tb_u", "zscore (tb/u)", "zs tbu"],
    ),
    StandardColumnDefinition(
        key="berat_lahir",
        label="Berat Lahir (BBL)",
        description="Berat badan balita saat lahir (indikator riwayat BBLR jika < 2.5 kg)",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        unit="kg",
        aliases=["bb lahir", "berat lahir", "bbl", "bb_lahir", "berat badan lahir", "bbl (kg)", "bb lahir (kg)"],
    ),
    StandardColumnDefinition(
        key="panjang_lahir",
        label="Panjang Lahir (PBL)",
        description="Panjang badan saat lahir dalam satuan sentimeter",
        category="clinical",
        is_required_for_stunting=False,
        expected_type="float",
        unit="cm",
        aliases=["tb lahir", "panjang lahir", "pbl", "tb_lahir", "panjang badan lahir", "panjang lahir (cm)"],
    ),
    StandardColumnDefinition(
        key="tanggal_ukur",
        label="Tanggal Pengukuran",
        description="Tanggal kegiatan penimbangan atau pengukuran balita",
        category="administrative",
        is_required_for_stunting=False,
        expected_type="date",
        aliases=["tgl ukur", "tanggal ukur", "tanggal pengukuran", "tgl_pengukuran", "tgl_ukur", "tgl", "tanggal"],
    ),
]

# Pola regex untuk mendeteksi kolom data identitas pribadi (PII)
PII_PATTERNS = [
    r"nik",
    r"no_nik",
    r"nik_anak",
    r"nik_ibu",
    r"nik_ayah",
    r"no_ktp",
    r"nama",
    r"nama_anak",
    r"nama_balita",
    r"nama_ibu",
    r"nama_ayah",
    r"nama_orang_tua",
    r"nama_ortu",
    r"alamat",
    r"alamat_lengkap",
    r"rt_rw",
    r"no_hp",
    r"no_telp",
    r"telepon",
    r"no_kk",
]


def is_pii_column(col_name: str) -> bool:
    """Mengecek apakah nama kolom terindikasi memuat data identitas pribadi."""
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", col_name.strip().lower())
    for pattern in PII_PATTERNS:
        if pattern == cleaned or pattern in cleaned.split("_"):
            return True
    return False


def mask_pii_value(value: Any, col_name: str) -> str:
    """Menyamarkan nilai identitas pribadi untuk pratinjau antarmuka."""
    if value is None or str(value).strip() == "":
        return "-"

    val_str = str(value).strip()
    col_lower = col_name.lower()

    # NIK (umumnya 16 digit angka): simpan 6 digit pertama, samarkan sisanya
    if "nik" in col_lower or "ktp" in col_lower or "kk" in col_lower:
        if len(val_str) >= 8:
            return val_str[:6] + "******" + (val_str[-2:] if len(val_str) > 10 else "")
        return "******"

    # Nama orang / anak
    if "nama" in col_lower or "ibu" in col_lower or "ayah" in col_lower:
        words = val_str.split()
        if words:
            masked_words = []
            for w in words:
                if len(w) > 1:
                    masked_words.append(w[0] + "***")
                else:
                    masked_words.append("***")
            return " ".join(masked_words)
        return "***"

    # Alamat
    if "alamat" in col_lower or "rt" in col_lower:
        return "Dusun/Jalan *** (Disamarkan)"

    # No telepon / HP
    if "hp" in col_lower or "telp" in col_lower or "telepon" in col_lower:
        if len(val_str) >= 6:
            return val_str[:4] + "****" + val_str[-2:]
        return "08**********"

    return "***"


def normalize_text(text: str) -> str:
    """Membersihkan teks dan tanda baca untuk pencocokan alias kolom."""
    return re.sub(r"[\s_/\-\(\)\.]+", " ", text.strip().lower()).strip()


def find_suggested_mapping(col_name: str) -> Tuple[Optional[str], float]:
    """Mencari kandidat kolom standar yang paling cocok dengan nama kolom sumber."""
    norm_col = normalize_text(col_name)

    best_match = None
    best_confidence = 0.0

    for std in STANDARD_COLUMNS:
        # Kecocokan persis pada key
        if norm_col == std.key:
            return std.key, 1.0

        for alias in std.aliases:
            norm_alias = normalize_text(alias)
            if norm_col == norm_alias:
                return std.key, 0.95
            if norm_alias in norm_col or norm_col in norm_alias:
                confidence = 0.75
                if confidence > best_confidence:
                    best_match = std.key
                    best_confidence = confidence

    return best_match, best_confidence


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


def parse_csv_content(content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Membaca isi file CSV dengan deteksi encoding dan pembatas (delimiter)."""
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

    if not rows:
        raise ValueError("File memuat header kolom, namun tidak terdapat baris data balita di dalamnya.")

    return clean_headers, rows


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
) -> DatasetPreviewResponse:
    """Melakukan analisis kualitas, pemetaan otomatis, validasi rentang, dan pembentukan pratinjau."""
    total_rows = len(rows)
    total_columns = len(headers)

    # Profiling tiap kolom
    columns_summary: List[ColumnSummary] = []
    quality_issues: List[QualityIssue] = []

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
        is_pii = is_pii_column(h)

        # Ambil sampel nilai unik non-null (maksimal 5 sampel)
        sample_candidates = []
        for v in vals:
            if v is not None and str(v).strip() not in ("", "-", "nan", "none"):
                masked = mask_pii_value(v, h) if is_pii else str(v).strip()
                if masked not in sample_candidates:
                    sample_candidates.append(masked)
                if len(sample_candidates) >= 5:
                    break

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
                is_pii=is_pii,
                suggested_mapping=suggested_key if confidence >= 0.70 else None,
                mapping_confidence=confidence,
            )
        )

        # Catat isu nilai kosong jika melebihi ambang wajar
        if null_count > 0:
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

        # Validasi Usia Balita (normal: 0 - 60/72 bulan)
        if mapping == "usia_saat_ukur":
            invalid_age = 0
            for v in vals:
                try:
                    num = float(str(v).replace(",", "."))
                    if num < 0 or num > 72:
                        invalid_age += 1
                except (ValueError, TypeError):
                    pass
            if invalid_age > 0:
                quality_issues.append(
                    QualityIssue(
                        issue_type="invalid_range",
                        severity="warning",
                        column=col_summary.name,
                        message=f"Terdapat {invalid_age} baris dengan usia di luar rentang balita wajar (0–72 bulan).",
                        affected_rows_count=invalid_age,
                        details="Periksa apakah ada data anak berusia di atas 5 tahun atau salah input satuan (tahun vs bulan).",
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

    if not missing_required:
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
            if is_pii_column(h):
                preview_r[h] = mask_pii_value(raw_val, h)
            else:
                preview_r[h] = raw_val
        preview_rows.append(preview_r)

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
