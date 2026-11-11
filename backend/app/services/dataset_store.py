"""
Penyimpan dataset aktif dalam memori backend dan mesin komputasi visualisasi data balita (Stage 4.1).
Menjaga konsistensi data antara frontend dan backend tanpa duplikasi kalkulasi.
Mendukung kalkulasi komprehensif: TB/U, BB/U, BB/TB, kelompok usia, jenis kelamin,
distribusi wilayah, dan statistik Z-score.
"""
import re
import math
import statistics
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.data_management import DatasetPreviewResponse
from app.schemas.visualization import (
    DistributionItem,
    RegionDistributionItem,
    SummaryStats,
    FilterOptions,
    VisualizationFilterRequest,
    VisualizationResponse,
    ZScoreStats,
)
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardMonthlyTrendItem,
    DashboardRiskFactorItem,
    DashboardRegionSummaryItem,
    DashboardTableauAnalytics,
    DashboardSection1BirthWeight,
    DashboardSection2AgeCohort,
    DashboardSection3RegionalSpread,
    DashboardSection4PosyanduParenting,
    DashboardSection5MaternalFactors,
    BoxPlotStats,
    CategoryPrevalenceItem,
    ScatterPoint,
    AgeCohortItem,
    DesaSpreadItem,
    KecamatanSpreadItem,
    HeatmapCell,
    AnnotatedTimeSeriesPoint,
    DashboardTimeSeriesTrend,
)

# Penyimpanan dalam memori untuk dataset aktif
_ACTIVE_DATASET: Optional[Dict[str, Any]] = None


def set_active_dataset(
    filename: str,
    file_type: str,
    headers: List[str],
    rows: List[Dict[str, Any]],
    preview_response: DatasetPreviewResponse,
    column_mapping: Optional[Dict[str, str]] = None,
) -> None:
    """Menyimpan dataset yang baru diunggah sebagai dataset aktif di backend."""
    global _ACTIVE_DATASET

    # Default mapping dari rekomendasi kolom jika belum ditentukan
    mapping = column_mapping or {}
    if not mapping:
        for col in preview_response.columns:
            if col.suggested_mapping:
                mapping[col.name] = col.suggested_mapping

    _ACTIVE_DATASET = {
        "filename": filename,
        "file_type": file_type,
        "headers": headers,
        "rows": rows,
        "preview_response": preview_response,
        "column_mapping": mapping,
        "updated_at": datetime.now().strftime("%d %b %Y, %H:%M WIB"),
    }


def get_active_dataset() -> Optional[Dict[str, Any]]:
    """Mengambil dataset aktif saat ini."""
    return _ACTIVE_DATASET


def update_active_mapping(mapping: Dict[str, str]) -> None:
    """Memperbarui pemetaan kolom pada dataset aktif."""
    global _ACTIVE_DATASET
    if _ACTIVE_DATASET:
        _ACTIVE_DATASET["column_mapping"] = mapping
        _ACTIVE_DATASET["updated_at"] = datetime.now().strftime("%d %b %Y, %H:%M WIB")


def clear_active_dataset() -> None:
    """Mengosongkan dataset aktif dari memori."""
    global _ACTIVE_DATASET
    _ACTIVE_DATASET = None


def _find_source_col(column_mapping: Dict[str, str], standard_key: str) -> Optional[str]:
    """
    Mencari nama kolom sumber yang dipetakan ke kunci standar tertentu.
    Jika ada lebih dari satu kolom sumber yang dipetakan ke target yang sama,
    pilih kolom yang paling sesuai secara semantik dan cegah collision:
    - berat_badan: jangan memilih 'bblr' atau kolom riwayat kelahiran jika ada kolom berat aktual.
    - tinggi_badan: jangan memilih kolom 'lahir' atau 'pbl' jika ada kolom tinggi aktual.
    - berat_lahir: prioritaskan kolom kelahiran ('lahir', 'bbl').
    - panjang_lahir: prioritaskan kolom kelahiran ('lahir', 'pbl').
    """
    candidates = [src for src, tgt in column_mapping.items() if tgt == standard_key]
    if not candidates:
        return None

    if len(candidates) == 1:
        c = candidates[0]
        # Pengecekan keamanan: jika pemetaan memetakan bblr ke berat_badan secara keliru,
        # tolak karena bblr adalah flag biner 0/1.
        if standard_key == "berat_badan" and c.strip().lower() == "bblr":
            return None
        return c

    # Jika terdapat beberapa kandidat pemetaan untuk target yang sama:
    if standard_key == "berat_badan":
        preferred = [c for c in candidates if "bblr" not in c.lower() and "lahir" not in c.lower()]
        if preferred:
            for p in preferred:
                if any(k in p.lower() for k in ["berat_kg", "berat", "bb_kg", "bobot"]):
                    return p
            return preferred[0]
        return None

    if standard_key == "tinggi_badan":
        preferred = [c for c in candidates if "lahir" not in c.lower() and "pbl" not in c.lower()]
        if preferred:
            for p in preferred:
                if any(k in p.lower() for k in ["tinggi_cm", "tinggi", "tb_cm", "panjang"]):
                    return p
            return preferred[0]
        return None

    if standard_key == "berat_lahir":
        preferred = [c for c in candidates if "lahir" in c.lower() or "bbl" in c.lower()]
        if preferred:
            return preferred[0]

    if standard_key == "panjang_lahir":
        preferred = [c for c in candidates if "lahir" in c.lower() or "pbl" in c.lower()]
        if preferred:
            return preferred[0]

    if standard_key == "usia_saat_ukur":
        preferred = [c for c in candidates if not any(k in c.lower() for k in ["kelompok", "kategori", "grup", "group", "range", "rentang", "kohor"])]
        if preferred:
            for p in preferred:
                if any(k in p.lower() for k in ["usia_bulan", "umur_bulan", "usia_saat_ukur", "umur_saat_ukur", "usia", "umur"]):
                    return p
            return preferred[0]

    return candidates[0]


def _parse_numeric(val: Any) -> Optional[float]:
    """Mengurai nilai numerik secara aman dari string atau angka (mendukung koma desimal)."""
    if val is None:
        return None
    s = str(val).strip().replace(",", ".")
    if not s or s in ["-", "null", "none", "nan", "nil"]:
        return None
    try:
        return float(s)
    except ValueError:
        m = re.search(r"[-+]?\d*\.?\d+", s)
        if m:
            try:
                return float(m.group(0))
            except ValueError:
                return None
    return None


def _get_age_group_label(age: float) -> str:
    """Mengelompokkan usia balita (dalam bulan) ke kategori epidemiologis standar."""
    if age < 6:
        return "0–5 bln"
    elif age < 12:
        return "6–11 bln"
    elif age < 24:
        return "12–23 bln"
    elif age < 36:
        return "24–35 bln"
    elif age < 48:
        return "36–47 bln"
    elif age < 60:
        return "48–59 bln"
    else:
        return "Di luar cakupan (≥ 60 bln)"


def _matches_age_group(age: float, filter_group: str) -> bool:
    """Mengecek apakah usia cocok dengan filter kelompok usia."""
    fg = filter_group.lower().replace("–", "-").replace(" ", "").replace("bln", "").replace("bulan", "")
    if "0-5" in fg or fg == "0-5":
        return 0 <= age < 6
    elif "6-11" in fg or fg == "6-11":
        return 6 <= age < 12
    elif "12-23" in fg or fg == "12-23":
        return 12 <= age < 24
    elif "24-35" in fg or fg == "24-35":
        return 24 <= age < 36
    elif "36-47" in fg or fg == "36-47":
        return 36 <= age < 48
    elif "48-59" in fg or fg == "48-59":
        return 48 <= age < 60
    elif "60" in fg or "luar" in fg:
        return age >= 60
    return True


def _compute_zscore_stats(
    filtered_rows: List[Dict[str, Any]],
    col_zs: Optional[str],
    indicator_name: str
) -> ZScoreStats:
    """Menghitung ringkasan statistik dan distribusi histogram untuk indikator Z-score baku WHO."""
    if not col_zs:
        return ZScoreStats(
            has_column=False,
            unmapped_reason=(
                f"Kolom Z-Score {indicator_name} belum dipetakan atau tidak tersedia pada dataset aktif."
            ),
            count_valid=0,
            distribution=[],
        )

    valid_scores: List[float] = []
    for r in filtered_rows:
        num = _parse_numeric(r.get(col_zs))
        # Z-score WHO balita biologis wajar berada di antara -6 SD s/d +6 SD
        if num is not None and -10.0 <= num <= 10.0:
            valid_scores.append(num)

    if not valid_scores:
        return ZScoreStats(
            has_column=True,
            unmapped_reason=f"Kolom Z-Score {indicator_name} tersedia tetapi tidak ada nilai numerik valid yang ditemukan.",
            count_valid=0,
            distribution=[],
        )

    count_valid = len(valid_scores)
    mean_val = round(sum(valid_scores) / count_valid, 2)
    median_val = round(statistics.median(valid_scores), 2)
    min_val = round(min(valid_scores), 2)
    max_val = round(max(valid_scores), 2)

    # 7 rentang baku baku WHO untuk histogram Z-score
    bins_def = [
        ("< -3 SD", lambda z: z < -3.0),
        ("-3 s/d -2 SD", lambda z: -3.0 <= z < -2.0),
        ("-2 s/d -1 SD", lambda z: -2.0 <= z < -1.0),
        ("-1 s/d 0 SD", lambda z: -1.0 <= z < 0.0),
        ("0 s/d +1 SD", lambda z: 0.0 <= z < 1.0),
        ("+1 s/d +2 SD", lambda z: 1.0 <= z <= 2.0),
        ("> +2 SD", lambda z: z > 2.0),
    ]

    distribution: List[DistributionItem] = []
    for label, pred in bins_def:
        cnt = sum(1 for z in valid_scores if pred(z))
        pct = round((cnt / count_valid) * 100.0, 1)
        distribution.append(DistributionItem(category=label, count=cnt, percentage=pct))

    return ZScoreStats(
        has_column=True,
        unmapped_reason=None,
        count_valid=count_valid,
        mean=mean_val,
        median=median_val,
        min_value=min_val,
        max_value=max_val,
        distribution=distribution,
    )


def compute_visualization(filter_req: Optional[VisualizationFilterRequest] = None) -> VisualizationResponse:
    """
    Menghitung agregasi statistik, distribusi status gizi (TB/U, BB/U, BB/TB), usia,
    gender, wilayah, dan Z-Score berdasarkan dataset aktif dan kriteria filter.
    """
    req = filter_req or VisualizationFilterRequest()
    dataset = get_active_dataset()

    if not dataset or not dataset.get("rows"):
        return VisualizationResponse(
            has_active_dataset=False,
            filename=None,
            total_unfiltered_rows=0,
            total_filtered_rows=0,
            warnings=["Belum ada dataset balita yang aktif. Silakan unggah berkas terlebih dahulu."],
        )

    rows: List[Dict[str, Any]] = dataset["rows"]
    mapping: Dict[str, str] = req.column_mapping or dataset.get("column_mapping", {})
    filename: str = dataset.get("filename", "dataset_balita")

    # Identifikasi kolom sumber untuk setiap standar
    col_tbu = _find_source_col(mapping, "status_tb_u")
    col_bbu = _find_source_col(mapping, "status_bb_u")
    col_bbtb = _find_source_col(mapping, "status_bb_tb")
    col_gender = _find_source_col(mapping, "jenis_kelamin")
    col_kec = _find_source_col(mapping, "kecamatan")
    col_pkm = _find_source_col(mapping, "puskesmas")
    col_desa = _find_source_col(mapping, "desa_kelurahan")
    col_date = _find_source_col(mapping, "tanggal_ukur")
    col_age = _find_source_col(mapping, "usia_saat_ukur")
    col_weight = _find_source_col(mapping, "berat_badan")
    col_height = _find_source_col(mapping, "tinggi_badan")
    col_zs_tbu = _find_source_col(mapping, "zscore_tb_u")
    col_zs_bbu = _find_source_col(mapping, "zscore_bb_u")
    col_zs_bbtb = _find_source_col(mapping, "zscore_bb_tb")

    # Kolom pendukung analisis lanjutan (BBLR, PBL, KMS, Ibu, LiLA)
    col_bbl = _find_source_col(mapping, "berat_lahir")
    col_pbl = _find_source_col(mapping, "panjang_lahir")
    col_naik_bb = _find_source_col(mapping, "status_naik_berat_badan")
    col_kelas_ibu = _find_source_col(mapping, "kelas_ibu_balita")
    col_lila = _find_source_col(mapping, "lila_ibu")
    col_status_lila = _find_source_col(mapping, "status_lila")

    # Kumpulkan opsi filter yang tersedia dari seluruh baris (unfiltered)
    all_kec = sorted({str(r.get(col_kec)).strip() for r in rows if col_kec and r.get(col_kec) and str(r.get(col_kec)).strip() not in ["-", "null", "none"]})
    all_pkm = sorted({str(r.get(col_pkm)).strip() for r in rows if col_pkm and r.get(col_pkm) and str(r.get(col_pkm)).strip() not in ["-", "null", "none"]})
    all_desa = sorted({str(r.get(col_desa)).strip() for r in rows if col_desa and r.get(col_desa) and str(r.get(col_desa)).strip() not in ["-", "null", "none"]})
    all_dates = sorted({str(r.get(col_date)).strip() for r in rows if col_date and r.get(col_date) and str(r.get(col_date)).strip() not in ["-", "null", "none"]})

    raw_genders = {str(r.get(col_gender)).strip() for r in rows if col_gender and r.get(col_gender) and str(r.get(col_gender)).strip() not in ["-", "null", "none"]}
    all_gender_opts = sorted(list(raw_genders))

    # Opsi kelompok usia jika kolom usia ada (kohor balita 0–59 bulan)
    age_groups_present: List[str] = []
    if col_age:
        standard_groups = ["0–5 bln", "6–11 bln", "12–23 bln", "24–35 bln", "36–47 bln", "48–59 bln"]
        found_groups = set()
        has_out_of_scope_val = False
        for r in rows:
            parsed_a = _parse_numeric(r.get(col_age))
            if parsed_a is not None and parsed_a >= 0:
                if parsed_a < 60:
                    found_groups.add(_get_age_group_label(parsed_a))
                else:
                    has_out_of_scope_val = True
        age_groups_present = [g for g in standard_groups if g in found_groups]
        if has_out_of_scope_val:
            age_groups_present.append("Di luar cakupan (≥ 60 bln)")

    filter_options = FilterOptions(
        kecamatan_list=all_kec,
        puskesmas_list=all_pkm,
        desa_kelurahan_list=all_desa,
        jenis_kelamin_list=all_gender_opts,
        age_group_list=age_groups_present,
        periode_list=all_dates,
    )

    # Terapkan filter
    filtered_rows: List[Dict[str, Any]] = []
    for r in rows:
        if req.kecamatan and col_kec:
            if str(r.get(col_kec, "")).strip().lower() != req.kecamatan.strip().lower():
                continue
        if req.puskesmas and col_pkm:
            if str(r.get(col_pkm, "")).strip().lower() != req.puskesmas.strip().lower():
                continue
        if req.desa_kelurahan and col_desa:
            if str(r.get(col_desa, "")).strip().lower() != req.desa_kelurahan.strip().lower():
                continue
        if req.jenis_kelamin and col_gender:
            val_g = str(r.get(col_gender, "")).strip().upper()
            target_g = req.jenis_kelamin.strip().upper()
            # Dukung pencocokan L / Laki-laki dan P / Perempuan
            if target_g in ["L", "LAKI-LAKI", "LAKI"]:
                if val_g not in ["L", "LAKI-LAKI", "LAKI", "MALE", "M"]:
                    continue
            elif target_g in ["P", "PEREMPUAN", "WANITA"]:
                if val_g not in ["P", "PEREMPUAN", "WANITA", "FEMALE", "F"]:
                    continue
            else:
                if val_g != target_g:
                    continue
        if req.age_group and col_age:
            parsed_a = _parse_numeric(r.get(col_age))
            if parsed_a is None or not _matches_age_group(parsed_a, req.age_group):
                continue
        if req.status_stunting:
            is_stunt = _is_stunting_row(r, col_tbu, col_zs_tbu)
            target_st = req.status_stunting.strip().lower()
            if target_st in ["stunting", "pendek", "sangat pendek"]:
                if is_stunt is not True:
                    continue
            elif target_st in ["tidak stunting", "normal", "non-stunting", "tidak_stunting"]:
                if is_stunt is not False:
                    continue
        if req.periode and col_date:
            if str(r.get(col_date, "")).strip().lower() != req.periode.strip().lower():
                continue

        filtered_rows.append(r)

    total_unfiltered = len(rows)
    total_filtered = len(filtered_rows)

    # Hitung data valid dan kelengkapan indikator
    valid_count = 0
    tbu_count = 0
    bbu_count = 0
    bbtb_count = 0
    age_valid_count = 0
    in_scope_balita_count = 0
    out_of_scope_age_count = 0

    for r in filtered_rows:
        is_row_valid = True
        parsed_age = _parse_numeric(r.get(col_age)) if col_age else None
        if col_age:
            if parsed_age is None or parsed_age < 0 or parsed_age > 120:
                is_row_valid = False
            else:
                age_valid_count += 1
                if parsed_age < 60:
                    in_scope_balita_count += 1
                else:
                    out_of_scope_age_count += 1
        if col_height:
            parsed_h = _parse_numeric(r.get(col_height))
            if parsed_h is None or parsed_h < 30 or parsed_h > 150:
                is_row_valid = False

        if is_row_valid:
            valid_count += 1

        if col_tbu:
            v_tbu = str(r.get(col_tbu, "")).strip()
            if v_tbu and v_tbu != "-" and v_tbu.lower() not in ["null", "none"]:
                tbu_count += 1

        if col_bbu:
            v_bbu = str(r.get(col_bbu, "")).strip()
            if v_bbu and v_bbu != "-" and v_bbu.lower() not in ["null", "none"]:
                bbu_count += 1

        if col_bbtb:
            v_bbtb = str(r.get(col_bbtb, "")).strip()
            if v_bbtb and v_bbtb != "-" and v_bbtb.lower() not in ["null", "none"]:
                bbtb_count += 1

    # Wilayah yang tersedia
    available_region_types: List[str] = []
    if col_kec:
        available_region_types.append("kecamatan")
    if col_pkm:
        available_region_types.append("puskesmas")
    if col_desa:
        available_region_types.append("desa_kelurahan")

    # Tentukan selected region type
    selected_region_type = req.region_type or "puskesmas"
    if selected_region_type not in available_region_types:
        if "puskesmas" in available_region_types:
            selected_region_type = "puskesmas"
        elif "kecamatan" in available_region_types:
            selected_region_type = "kecamatan"
        elif "desa_kelurahan" in available_region_types:
            selected_region_type = "desa_kelurahan"
        else:
            selected_region_type = "none"

    # Hitung jumlah wilayah unik
    active_region_col = None
    if selected_region_type == "kecamatan":
        active_region_col = col_kec
    elif selected_region_type == "puskesmas":
        active_region_col = col_pkm
    elif selected_region_type == "desa_kelurahan":
        active_region_col = col_desa

    unique_regions_count = 0
    if active_region_col:
        unique_regions_count = len({
            str(r.get(active_region_col)).strip()
            for r in filtered_rows
            if r.get(active_region_col) and str(r.get(active_region_col)).strip() not in ["-", "null", "none"]
        })

    summary = SummaryStats(
        total_records=total_filtered,
        valid_records=valid_count,
        records_with_tbu=tbu_count,
        records_with_bbu=bbu_count,
        records_with_bbtb=bbtb_count,
        records_with_age=age_valid_count,
        in_scope_balita_count=in_scope_balita_count,
        out_of_scope_age_count=out_of_scope_age_count,
        unique_regions_count=unique_regions_count,
        region_label_used=selected_region_type,
    )

    # 1. Distribusi Status Gizi (TB/U)
    status_tbu_distribution: List[DistributionItem] = []
    has_status_tbu_column = col_tbu is not None
    status_tbu_unmapped_reason = None

    if not has_status_tbu_column:
        status_tbu_unmapped_reason = (
            "Kolom Status Gizi (TB/U) belum dipetakan atau tidak tersedia pada berkas dataset yang diunggah. "
            "Anda dapat memetakan kolom TB/U pada menu Data Balita."
        )
    else:
        tbu_counts: Dict[str, int] = {}
        for r in filtered_rows:
            raw_val = str(r.get(col_tbu, "")).strip()
            if not raw_val or raw_val in ["-", "null", "none", "nan"]:
                continue
            tbu_counts[raw_val] = tbu_counts.get(raw_val, 0) + 1

        denom_tbu = tbu_count if tbu_count > 0 else 1
        standard_tbu_order = ["Sangat Pendek", "Pendek", "Normal", "Tinggi"]
        sorted_tbu_keys = sorted(
            tbu_counts.keys(),
            key=lambda k: standard_tbu_order.index(k) if k in standard_tbu_order else 99
        )
        for cat in sorted_tbu_keys:
            cnt = tbu_counts[cat]
            pct = round((cnt / denom_tbu) * 100.0, 1)
            status_tbu_distribution.append(DistributionItem(category=cat, count=cnt, percentage=pct))

    # 2. Distribusi Status Gizi (BB/U)
    status_bbu_distribution: List[DistributionItem] = []
    has_status_bbu_column = col_bbu is not None
    status_bbu_unmapped_reason = None

    if not has_status_bbu_column:
        status_bbu_unmapped_reason = (
            "Kolom Status Gizi (BB/U) belum dipetakan atau tidak ditemukan pada berkas dataset. "
            "Visualisasi BB/U dapat ditampilkan apabila kolom BB/U dipetakan pada menu Data Balita."
        )
    else:
        bbu_counts: Dict[str, int] = {}
        for r in filtered_rows:
            raw_val = str(r.get(col_bbu, "")).strip()
            if not raw_val or raw_val in ["-", "null", "none", "nan"]:
                continue
            bbu_counts[raw_val] = bbu_counts.get(raw_val, 0) + 1

        denom_bbu = bbu_count if bbu_count > 0 else 1
        standard_bbu_order = [
            "Berat Badan Sangat Kurang",
            "Sangat Kurang",
            "Berat Badan Kurang",
            "Kurang",
            "Berat Badan Normal",
            "Normal",
            "Risiko Berat Badan Lebih",
            "Risiko Lebih",
            "Lebih"
        ]
        sorted_bbu_keys = sorted(
            bbu_counts.keys(),
            key=lambda k: standard_bbu_order.index(k) if k in standard_bbu_order else 99
        )
        for cat in sorted_bbu_keys:
            cnt = bbu_counts[cat]
            pct = round((cnt / denom_bbu) * 100.0, 1)
            status_bbu_distribution.append(DistributionItem(category=cat, count=cnt, percentage=pct))

    # 3. Distribusi Status Gizi (BB/TB)
    status_bbtb_distribution: List[DistributionItem] = []
    has_status_bbtb_column = col_bbtb is not None
    status_bbtb_unmapped_reason = None

    if not has_status_bbtb_column:
        status_bbtb_unmapped_reason = (
            "Kolom Status Gizi (BB/TB) belum dipetakan atau tidak ditemukan pada berkas dataset. "
            "Visualisasi BB/TB dapat ditampilkan apabila kolom BB/TB dipetakan pada menu Data Balita."
        )
    else:
        bbtb_counts: Dict[str, int] = {}
        for r in filtered_rows:
            raw_val = str(r.get(col_bbtb, "")).strip()
            if not raw_val or raw_val in ["-", "null", "none", "nan"]:
                continue
            bbtb_counts[raw_val] = bbtb_counts.get(raw_val, 0) + 1

        denom_bbtb = bbtb_count if bbtb_count > 0 else 1
        standard_bbtb_order = [
            "Gizi Buruk",
            "Gizi Kurang",
            "Gizi Baik",
            "Normal",
            "Berisiko Gizi Lebih",
            "Gizi Lebih",
            "Obesitas"
        ]
        sorted_bbtb_keys = sorted(
            bbtb_counts.keys(),
            key=lambda k: standard_bbtb_order.index(k) if k in standard_bbtb_order else 99
        )
        for cat in sorted_bbtb_keys:
            cnt = bbtb_counts[cat]
            pct = round((cnt / denom_bbtb) * 100.0, 1)
            status_bbtb_distribution.append(DistributionItem(category=cat, count=cnt, percentage=pct))

    # 4. Distribusi Usia Balita per Kelompok Usia (Kohor Balita 0–59 bulan)
    age_group_distribution: List[DistributionItem] = []
    has_age_column = col_age is not None
    age_unmapped_reason = None

    if not has_age_column:
        age_unmapped_reason = (
            "Kolom Usia Saat Ukur belum dipetakan dalam dataset. "
            "Visualisasi distribusi kelompok usia belum dapat disajikan."
        )
    else:
        age_counts: Dict[str, int] = {
            "0–5 bln": 0,
            "6–11 bln": 0,
            "12–23 bln": 0,
            "24–35 bln": 0,
            "36–47 bln": 0,
            "48–59 bln": 0,
        }
        for r in filtered_rows:
            parsed_a = _parse_numeric(r.get(col_age))
            if parsed_a is not None and 0 <= parsed_a < 60:
                grp_lbl = _get_age_group_label(parsed_a)
                if grp_lbl in age_counts:
                    age_counts[grp_lbl] += 1

        denom_age = in_scope_balita_count if in_scope_balita_count > 0 else 1
        standard_balita_order = ["0–5 bln", "6–11 bln", "12–23 bln", "24–35 bln", "36–47 bln", "48–59 bln"]
        for grp in standard_balita_order:
            cnt = age_counts.get(grp, 0)
            pct = round((cnt / denom_age) * 100.0, 1)
            age_group_distribution.append(DistributionItem(category=grp, count=cnt, percentage=pct))

        # Tandai data usia >= 60 bulan secara terpisah agar tidak mendistorsi kohor balita 0–59 bulan
        if out_of_scope_age_count > 0:
            total_age_all = in_scope_balita_count + out_of_scope_age_count
            pct_out = round((out_of_scope_age_count / total_age_all) * 100.0, 1)
            age_group_distribution.append(
                DistributionItem(
                    category="Di luar cakupan (≥ 60 bln)",
                    count=out_of_scope_age_count,
                    percentage=pct_out,
                )
            )

    # 5. Distribusi Jenis Kelamin
    gender_distribution: List[DistributionItem] = []
    has_gender_column = col_gender is not None
    gender_unmapped_reason = None

    if not has_gender_column:
        gender_unmapped_reason = (
            "Kolom Jenis Kelamin belum dipetakan atau tidak ditemukan pada berkas dataset. "
            "Silakan petakan kolom Jenis Kelamin pada menu Data Balita."
        )
    else:
        gender_counts: Dict[str, int] = {}
        total_gender_filled = 0
        for r in filtered_rows:
            raw_val = str(r.get(col_gender, "")).strip()
            if not raw_val or raw_val in ["-", "null", "none"]:
                continue

            # Standardisasi label tampilan tanpa mengubah integritas data
            norm_val = raw_val.upper()
            if norm_val in ["L", "LAKI-LAKI", "LAKI", "MALE", "M"]:
                label = "Laki-laki (L)"
            elif norm_val in ["P", "PEREMPUAN", "WANITA", "FEMALE", "F"]:
                label = "Perempuan (P)"
            else:
                label = raw_val

            gender_counts[label] = gender_counts.get(label, 0) + 1
            total_gender_filled += 1

        denom_g = total_gender_filled if total_gender_filled > 0 else 1
        for label, cnt in gender_counts.items():
            pct = round((cnt / denom_g) * 100.0, 1)
            gender_distribution.append(DistributionItem(category=label, count=cnt, percentage=pct))

    # 6. Distribusi Wilayah
    region_distribution: List[RegionDistributionItem] = []
    region_unmapped_reason = None

    if not active_region_col:
        region_unmapped_reason = (
            "Kolom wilayah (Kecamatan, Puskesmas, atau Desa/Kelurahan) belum dipetakan dalam dataset. "
            "Grafik distribusi wilayah tidak dapat dibuat."
        )
    else:
        region_counts: Dict[str, Dict[str, int]] = {}
        total_region_filled = 0

        for r in filtered_rows:
            raw_reg = str(r.get(active_region_col, "")).strip()
            if not raw_reg or raw_reg in ["-", "null", "none"]:
                continue

            if raw_reg not in region_counts:
                region_counts[raw_reg] = {"total": 0, "stunting": 0, "normal": 0}

            region_counts[raw_reg]["total"] += 1
            total_region_filled += 1

            if col_tbu:
                tbu_val = str(r.get(col_tbu, "")).strip().lower()
                if "pendek" in tbu_val:  # 'pendek' atau 'sangat pendek'
                    region_counts[raw_reg]["stunting"] += 1
                elif "normal" in tbu_val:
                    region_counts[raw_reg]["normal"] += 1

        denom_r = total_region_filled if total_region_filled > 0 else 1
        sorted_regions = sorted(
            region_counts.items(),
            key=lambda x: x[1]["total"],
            reverse=True
        )

        for reg_name, stats in sorted_regions:
            pct = round((stats["total"] / denom_r) * 100.0, 1)
            region_distribution.append(
                RegionDistributionItem(
                    region_name=reg_name,
                    count=stats["total"],
                    percentage=pct,
                    stunting_count=stats["stunting"] if col_tbu else None,
                    normal_count=stats["normal"] if col_tbu else None,
                )
            )

    # 7. Distribusi Z-Score (TB/U, BB/U, BB/TB)
    zscore_tbu = _compute_zscore_stats(filtered_rows, col_zs_tbu, "TB/U")
    zscore_bbu = _compute_zscore_stats(filtered_rows, col_zs_bbu, "BB/U")
    zscore_bbtb = _compute_zscore_stats(filtered_rows, col_zs_bbtb, "BB/TB")

    active_filters_dict = {
        "kecamatan": req.kecamatan,
        "puskesmas": req.puskesmas,
        "desa_kelurahan": req.desa_kelurahan,
        "jenis_kelamin": req.jenis_kelamin,
        "age_group": req.age_group,
        "periode": req.periode,
    }

    warnings: List[str] = []
    if total_filtered == 0 and total_unfiltered > 0:
        warnings.append("Tidak ditemukan data balita yang cocok dengan kombinasi filter yang dipilih.")
    if out_of_scope_age_count > 0:
        warnings.append(
            f"Terdapat {out_of_scope_age_count} data anak dengan usia ≥ 60 bulan yang berada di luar cakupan balita penelitian (0–59 bulan)."
        )

    tableau_analytics = _compute_dashboard_tableau_analytics(
        all_rows=rows,
        mapping=mapping,
        col_tbu=col_tbu,
        col_zs_tbu=col_zs_tbu,
        col_age=col_age,
        col_kec=col_kec,
        col_pkm=col_pkm,
        col_desa=col_desa,
        desa_filter=req.desa_kelurahan,
        section_rows=filtered_rows,
    )

    return VisualizationResponse(
        has_active_dataset=True,
        filename=filename,
        total_unfiltered_rows=total_unfiltered,
        total_filtered_rows=total_filtered,
        summary=summary,
        has_status_tbu_column=has_status_tbu_column,
        status_tbu_distribution=status_tbu_distribution,
        status_tbu_unmapped_reason=status_tbu_unmapped_reason,
        has_status_bbu_column=has_status_bbu_column,
        status_bbu_distribution=status_bbu_distribution,
        status_bbu_unmapped_reason=status_bbu_unmapped_reason,
        has_status_bbtb_column=has_status_bbtb_column,
        status_bbtb_distribution=status_bbtb_distribution,
        status_bbtb_unmapped_reason=status_bbtb_unmapped_reason,
        has_age_column=has_age_column,
        age_group_distribution=age_group_distribution,
        age_unmapped_reason=age_unmapped_reason,
        has_gender_column=has_gender_column,
        gender_distribution=gender_distribution,
        gender_unmapped_reason=gender_unmapped_reason,
        available_region_types=available_region_types,
        selected_region_type=selected_region_type,
        region_distribution=region_distribution,
        region_unmapped_reason=region_unmapped_reason,
        zscore_tbu=zscore_tbu,
        zscore_bbu=zscore_bbu,
        zscore_bbtb=zscore_bbtb,
        filter_options=filter_options,
        active_filters=active_filters_dict,
        warnings=warnings,
        tableau_analytics=tableau_analytics,
    )


def _percentile(sorted_vals: List[float], p: float) -> float:
    """Menghitung persentil secara linear interpolation pada array yang telah terurut."""
    if not sorted_vals:
        return 0.0
    if p <= 0:
        return sorted_vals[0]
    if p >= 100:
        return sorted_vals[-1]
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_vals[int(k)]
    d0 = sorted_vals[int(f)] * (c - k)
    d1 = sorted_vals[int(c)] * (k - f)
    return d0 + d1


def _compute_boxplot(values: List[float]) -> Optional[BoxPlotStats]:
    """Menghitung statistik lima angka (min, Q1, median, Q3, max) dan mean untuk box plot."""
    if not values:
        return None
    sorted_v = sorted(values)
    n = len(sorted_v)
    min_val = round(sorted_v[0], 2)
    max_val = round(sorted_v[-1], 2)
    mean_val = round(sum(sorted_v) / n, 2)
    median_val = round(_percentile(sorted_v, 50.0), 2)
    q1_val = round(_percentile(sorted_v, 25.0), 2)
    q3_val = round(_percentile(sorted_v, 75.0), 2)

    return BoxPlotStats(
        min_value=min_val,
        q1=q1_val,
        median=median_val,
        q3=q3_val,
        max_value=max_val,
        mean=mean_val,
        count=n,
    )


def _compute_pearson_r(xs: List[float], ys: List[float]) -> Optional[float]:
    """Menghitung koefisien korelasi Pearson r antara dua vektor variabel numerik."""
    if len(xs) != len(ys) or len(xs) < 3:
        return None
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n

    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    denom = math.sqrt(var_x * var_y)

    if denom == 0:
        return 0.0

    r = numerator / denom
    r = max(-1.0, min(1.0, r))
    return round(r, 3)


def _is_stunting_row(row: Dict[str, Any], col_tbu: Optional[str], col_zs_tbu: Optional[str]) -> Optional[bool]:
    """Menentukan status diagnosis stunting balita berdasarkan kolom TB/U atau Z-Score TB/U."""
    if col_tbu:
        v = str(row.get(col_tbu, "")).strip().lower()
        if "pendek" in v:
            return True
        elif "normal" in v or "tinggi" in v:
            return False
    if col_zs_tbu:
        zs = _parse_numeric(row.get(col_zs_tbu))
        if zs is not None:
            return zs < -2.0
    return None


def _compute_dashboard_tableau_analytics(
    all_rows: List[Dict[str, Any]],
    mapping: Dict[str, str],
    col_tbu: Optional[str],
    col_zs_tbu: Optional[str],
    col_age: Optional[str],
    col_kec: Optional[str],
    col_pkm: Optional[str],
    col_desa: Optional[str],
    desa_filter: Optional[str] = None,
    section_rows: Optional[List[Dict[str, Any]]] = None,
) -> DashboardTableauAnalytics:
    """
    Menghitung lima kelompok visualisasi Dashboard sesuai acuan analisis Tableau:
    Bagian 1: Pengaruh Berat Lahir terhadap Risiko Stunting
    Bagian 2: Jumlah Stunting Berdasarkan Kelompok Usia
    Bagian 3: Sebaran Stunting Berdasarkan Wilayah
    Bagian 4: Pengaruh Kehadiran Posyandu dan Pola Asuh Ibu
    Bagian 5: Hubungan Faktor Ibu dan Kondisi Kelahiran
    """
    col_bbl = _find_source_col(mapping, "berat_lahir")
    col_pbl = _find_source_col(mapping, "panjang_lahir")
    col_naik_bb = _find_source_col(mapping, "status_naik_berat_badan")
    col_kelas_ibu = _find_source_col(mapping, "kelas_ibu_balita")
    col_lila = _find_source_col(mapping, "lila_ibu")
    col_status_lila = _find_source_col(mapping, "status_lila")

    # Filter data balita untuk Bagian 1, 2, 4, 5 jika terdapat filter desa aktif atau section_rows ditentukan
    if section_rows is None:
        norm_desa_filter = desa_filter.strip().lower() if desa_filter and desa_filter.strip() else None
        if norm_desa_filter and col_desa:
            section_rows = [
                r for r in all_rows
                if str(r.get(col_desa, "")).strip().lower() == norm_desa_filter
            ]
        else:
            section_rows = all_rows

    # -------------------------------------------------------------------------
    # BAGIAN 1: Pengaruh Berat Lahir terhadap Risiko Stunting
    # -------------------------------------------------------------------------
    sec1 = DashboardSection1BirthWeight()
    if not col_bbl:
        sec1.has_column = False
        sec1.unmapped_reason = (
            "Kolom Berat Lahir (BBL) belum dipetakan. "
            "Petakan kolom Berat Lahir pada menu Data Balita untuk menampilkan analisis Bagian 1."
        )
    else:
        sec1.has_column = True
        valid_bbl_pairs: List[Tuple[float, Optional[float], Optional[bool], str]] = []
        bblr_rows = []
        normal_bbl_rows = []

        for r in section_rows:
            bbl_val = _parse_numeric(r.get(col_bbl))
            if bbl_val is not None and 0.5 <= bbl_val <= 8.0:
                is_stunt = _is_stunting_row(r, col_tbu, col_zs_tbu)
                zs_val = _parse_numeric(r.get(col_zs_tbu)) if col_zs_tbu else None
                lbl = str(r.get(col_desa or col_pkm or col_kec, "Balita"))
                valid_bbl_pairs.append((bbl_val, zs_val, is_stunt, lbl))

                if bbl_val < 2.5:
                    bblr_rows.append((bbl_val, is_stunt))
                else:
                    normal_bbl_rows.append((bbl_val, is_stunt))

        sec1.total_valid = len(valid_bbl_pairs)
        if sec1.total_valid > 0:
            all_bbl_vals = [p[0] for p in valid_bbl_pairs]
            sec1.mean_birth_weight = round(sum(all_bbl_vals) / len(all_bbl_vals), 2)

            sec1.bblr_count = len(bblr_rows)
            sec1.bblr_rate_overall = round((sec1.bblr_count / sec1.total_valid) * 100.0, 1)

            sec1.bblr_stunting_count = sum(1 for _, is_stunt in bblr_rows if is_stunt is True)
            sec1.bblr_stunting_rate = (
                round((sec1.bblr_stunting_count / sec1.bblr_count) * 100.0, 1)
                if sec1.bblr_count > 0 else 0.0
            )

            sec1.normal_count = len(normal_bbl_rows)
            normal_stunt_cnt = sum(1 for _, is_stunt in normal_bbl_rows if is_stunt is True)
            sec1.normal_stunting_rate = (
                round((normal_stunt_cnt / sec1.normal_count) * 100.0, 1)
                if sec1.normal_count > 0 else 0.0
            )

            # Kategori Bar Chart
            sec1.categories = [
                CategoryPrevalenceItem(
                    category="BBLR (< 2,5 kg)",
                    total_count=sec1.bblr_count,
                    stunting_count=sec1.bblr_stunting_count,
                    normal_count=sec1.bblr_count - sec1.bblr_stunting_count,
                    stunting_rate=sec1.bblr_stunting_rate,
                    percentage_of_total=sec1.bblr_rate_overall,
                ),
                CategoryPrevalenceItem(
                    category="Normal (≥ 2,5 kg)",
                    total_count=sec1.normal_count,
                    stunting_count=normal_stunt_cnt,
                    normal_count=sec1.normal_count - normal_stunt_cnt,
                    stunting_rate=sec1.normal_stunting_rate,
                    percentage_of_total=round((sec1.normal_count / sec1.total_valid) * 100.0, 1),
                ),
            ]

            # Boxplot: Stunting vs Normal
            stunt_bbls = [p[0] for p in valid_bbl_pairs if p[2] is True]
            norm_bbls = [p[0] for p in valid_bbl_pairs if p[2] is False]
            sec1.boxplot_stunting = _compute_boxplot(stunt_bbls)
            sec1.boxplot_normal = _compute_boxplot(norm_bbls)

            # Scatter Sample (X: berat lahir kg, Y: Z-score TB/U)
            scatter_candidates = [
                ScatterPoint(x=round(p[0], 2), y=round(p[1], 2), is_stunting=(p[2] is True), label=p[3])
                for p in valid_bbl_pairs
                if p[1] is not None and -8.0 <= p[1] <= 8.0
            ]
            if len(scatter_candidates) > 350:
                step = len(scatter_candidates) / 350
                sec1.scatter_sample = [scatter_candidates[int(i * step)] for i in range(350)]
            else:
                sec1.scatter_sample = scatter_candidates

    # -------------------------------------------------------------------------
    # BAGIAN 2: Jumlah Stunting Berdasarkan Kelompok Usia
    # -------------------------------------------------------------------------
    sec2 = DashboardSection2AgeCohort()
    if not col_age:
        sec2.has_column = False
        sec2.unmapped_reason = (
            "Kolom Usia Saat Ukur belum dipetakan dalam dataset aktif."
        )
    else:
        sec2.has_column = True
        cohort_defs = [
            ("0–5 bln", 0, 5),
            ("6–11 bln", 6, 11),
            ("12–23 bln", 12, 23),
            ("24–35 bln", 24, 35),
            ("36–47 bln", 36, 47),
            ("48–59 bln", 48, 59),
        ]

        cohort_items: List[AgeCohortItem] = []
        highest_rate = -1.0
        highest_name = None
        lowest_zscore = 999.0
        lowest_zname = None

        for label, min_a, max_a in cohort_defs:
            cohort_rows = [
                r for r in section_rows
                if _parse_numeric(r.get(col_age)) is not None
                and min_a <= _parse_numeric(r.get(col_age)) <= max_a  # type: ignore
            ]
            tot_cnt = len(cohort_rows)
            stunt_cnt = sum(1 for r in cohort_rows if _is_stunting_row(r, col_tbu, col_zs_tbu) is True)
            rate = round((stunt_cnt / tot_cnt) * 100.0, 1) if tot_cnt > 0 else 0.0

            # Z-scores
            zs_cohort: List[float] = []
            if col_zs_tbu:
                for r in cohort_rows:
                    zv = _parse_numeric(r.get(col_zs_tbu))
                    if zv is not None and -8.0 <= zv <= 8.0:
                        zs_cohort.append(zv)

            mean_zs = round(sum(zs_cohort) / len(zs_cohort), 2) if zs_cohort else None
            bplot = _compute_boxplot(zs_cohort) if zs_cohort else None

            if tot_cnt > 0 and rate > highest_rate:
                highest_rate = rate
                highest_name = label

            if mean_zs is not None and mean_zs < lowest_zscore:
                lowest_zscore = mean_zs
                lowest_zname = label

            cohort_items.append(
                AgeCohortItem(
                    cohort_label=label,
                    total_count=tot_cnt,
                    stunting_count=stunt_cnt,
                    stunting_rate=rate,
                    mean_zscore_tbu=mean_zs,
                    boxplot=bplot,
                )
            )

        sec2.cohorts = cohort_items
        sec2.highest_stunting_cohort = highest_name
        sec2.highest_stunting_rate = highest_rate if highest_rate >= 0 else None
        sec2.lowest_mean_zscore_cohort = lowest_zname

    # -------------------------------------------------------------------------
    # BAGIAN 3: Sebaran Stunting Berdasarkan Wilayah (Dihitung dari Seluruh Desa)
    # -------------------------------------------------------------------------
    sec3 = DashboardSection3RegionalSpread()
    target_reg_col = col_desa or col_pkm or col_kec
    if not target_reg_col:
        sec3.has_column = False
        sec3.unmapped_reason = (
            "Kolom wilayah (Desa/Kelurahan, Puskesmas, atau Kecamatan) belum dipetakan dalam dataset."
        )
    else:
        sec3.has_column = True
        desa_groups: Dict[str, Dict[str, Any]] = {}
        for r in all_rows:
            d_name = str(r.get(target_reg_col, "")).strip()
            if not d_name or d_name in ["-", "null", "none", "nan"]:
                continue
            if d_name not in desa_groups:
                kec_val = str(r.get(col_kec, "")).strip() if col_kec else None
                desa_groups[d_name] = {"total": 0, "stunting": 0, "kecamatan": kec_val}

            desa_groups[d_name]["total"] += 1
            if _is_stunting_row(r, col_tbu, col_zs_tbu) is True:
                desa_groups[d_name]["stunting"] += 1

        total_desas = len(desa_groups)
        sec3.total_desas_count = total_desas

        if total_desas > 0:
            rates_list = []
            prelim_desas = []
            for d_name, stat in desa_groups.items():
                tot = stat["total"]
                st_cnt = stat["stunting"]
                st_rate = round((st_cnt / tot) * 100.0, 1) if tot > 0 else 0.0
                rates_list.append(st_rate)
                prelim_desas.append((d_name, stat["kecamatan"], tot, st_cnt, st_rate))

            avg_rate = round(sum(rates_list) / len(rates_list), 1) if rates_list else 0.0
            sec3.avg_desa_stunting_rate = avg_rate
            sec3.desas_above_avg_count = sum(1 for item in prelim_desas if item[4] > avg_rate)

            # Urutkan berdasarkan stunting_rate desc, lalu total balita desc
            sorted_desas = sorted(prelim_desas, key=lambda x: (x[4], x[2]), reverse=True)

            sec3.top_10_high_stunting_desas = [
                DesaSpreadItem(
                    desa_name=item[0],
                    kecamatan=item[1],
                    total_balita=item[2],
                    stunting_count=item[3],
                    stunting_rate=item[4],
                    is_above_avg=(item[4] > avg_rate),
                )
                for item in sorted_desas[:10]
            ]

            sec3.all_desas = [
                DesaSpreadItem(
                    desa_name=item[0],
                    kecamatan=item[1],
                    total_balita=item[2],
                    stunting_count=item[3],
                    stunting_rate=item[4],
                    is_above_avg=(item[4] > avg_rate),
                )
                for item in sorted_desas
            ]

        # Small multiples prevalensi stunting berdasarkan kecamatan
        if col_kec:
            kec_map: Dict[str, Dict[str, Any]] = {}
            for r in all_rows:
                k_raw = str(r.get(col_kec, "")).strip()
                if not k_raw or k_raw in ["-", "null", "none", "nan"]:
                    continue
                if k_raw not in kec_map:
                    kec_map[k_raw] = {"total": 0, "stunting": 0, "desas": set()}
                kec_map[k_raw]["total"] += 1
                if _is_stunting_row(r, col_tbu, col_zs_tbu) is True:
                    kec_map[k_raw]["stunting"] += 1
                d_val = str(r.get(target_reg_col, "")).strip() if target_reg_col else ""
                if d_val and d_val not in ["-", "null", "none"]:
                    kec_map[k_raw]["desas"].add(d_val)

            sec3.kecamatan_spread = [
                KecamatanSpreadItem(
                    kecamatan_name=k_name,
                    total_balita=stat["total"],
                    stunting_count=stat["stunting"],
                    stunting_rate=round((stat["stunting"] / stat["total"]) * 100.0, 1) if stat["total"] > 0 else 0.0,
                    desa_count=len(stat["desas"]),
                )
                for k_name, stat in sorted(kec_map.items(), key=lambda x: x[1]["total"], reverse=True)
            ]

    # -------------------------------------------------------------------------
    # BAGIAN 4: Pengaruh Kehadiran Posyandu dan Pola Asuh Ibu terhadap Stunting
    # -------------------------------------------------------------------------
    sec4 = DashboardSection4PosyanduParenting()

    # Naik BB
    if not col_naik_bb:
        sec4.has_naik_bb = False
        sec4.naik_bb_unmapped_reason = (
            "Variabel Status Kenaikan Berat Badan (KMS SKDN: N/T/O/B) belum dipetakan. "
            "Data ini spesifik untuk pemantauan penimbangan Posyandu Puskesmas (misal Silaen)."
        )
    else:
        sec4.has_naik_bb = True
        naik_counts: Dict[str, Dict[str, int]] = {
            "N (Naik)": {"total": 0, "stunting": 0},
            "T (Tidak Naik)": {"total": 0, "stunting": 0},
            "O (Tidak Hadir)": {"total": 0, "stunting": 0},
            "B (Baru Pertama)": {"total": 0, "stunting": 0},
        }
        total_naik_valid = 0

        for r in section_rows:
            raw_n = str(r.get(col_naik_bb, "")).strip().upper()
            if not raw_n or raw_n in ["-", "NULL", "NONE"]:
                continue
            cat_key = None
            if raw_n in ["N", "NAIK", "YA"]:
                cat_key = "N (Naik)"
            elif raw_n in ["T", "TIDAK NAIK", "TURUN", "TIDAK"]:
                cat_key = "T (Tidak Naik)"
            elif raw_n in ["O", "TIDAK HADIR", "ABSEN"]:
                cat_key = "O (Tidak Hadir)"
            elif raw_n in ["B", "BARU", "PERTAMA"]:
                cat_key = "B (Baru Pertama)"

            if cat_key:
                naik_counts[cat_key]["total"] += 1
                total_naik_valid += 1
                if _is_stunting_row(r, col_tbu, col_zs_tbu) is True:
                    naik_counts[cat_key]["stunting"] += 1

        denom_naik = total_naik_valid if total_naik_valid > 0 else 1
        n_cat_list: List[CategoryPrevalenceItem] = []
        for cat_k, stat in naik_counts.items():
            tot = stat["total"]
            st = stat["stunting"]
            st_rate = round((st / tot) * 100.0, 1) if tot > 0 else 0.0
            pct_tot = round((tot / denom_naik) * 100.0, 1)
            n_cat_list.append(
                CategoryPrevalenceItem(
                    category=cat_k,
                    total_count=tot,
                    stunting_count=st,
                    normal_count=tot - st,
                    stunting_rate=st_rate,
                    percentage_of_total=pct_tot,
                )
            )
        sec4.naik_bb_categories = n_cat_list
        sec4.naik_bb_overall_rate = round((naik_counts["N (Naik)"]["total"] / denom_naik) * 100.0, 1)

    # Kelas Ibu
    if not col_kelas_ibu:
        sec4.has_kelas_ibu = False
        sec4.kelas_ibu_unmapped_reason = (
            "Variabel Keikutsertaan Kelas Ibu Balita belum dipetakan pada dataset aktif."
        )
    else:
        sec4.has_kelas_ibu = True
        ibu_counts = {
            "Mengikuti (Ya)": {"total": 0, "stunting": 0},
            "Tidak Mengikuti (Tidak)": {"total": 0, "stunting": 0},
        }
        total_ibu_valid = 0
        for r in section_rows:
            raw_i = str(r.get(col_kelas_ibu, "")).strip().lower()
            if not raw_i or raw_i in ["-", "null", "none"]:
                continue
            cat_k = None
            if raw_i in ["ya", "y", "ikut", "mengikuti", "true", "1"]:
                cat_k = "Mengikuti (Ya)"
            elif raw_i in ["tidak", "t", "tdk", "tidak ikut", "false", "0"]:
                cat_k = "Tidak Mengikuti (Tidak)"

            if cat_k:
                ibu_counts[cat_k]["total"] += 1
                total_ibu_valid += 1
                if _is_stunting_row(r, col_tbu, col_zs_tbu) is True:
                    ibu_counts[cat_k]["stunting"] += 1

        denom_ibu = total_ibu_valid if total_ibu_valid > 0 else 1
        ibu_cat_list: List[CategoryPrevalenceItem] = []
        for cat_k, stat in ibu_counts.items():
            tot = stat["total"]
            st = stat["stunting"]
            st_rate = round((st / tot) * 100.0, 1) if tot > 0 else 0.0
            pct_tot = round((tot / denom_ibu) * 100.0, 1)
            ibu_cat_list.append(
                CategoryPrevalenceItem(
                    category=cat_k,
                    total_count=tot,
                    stunting_count=st,
                    normal_count=tot - st,
                    stunting_rate=st_rate,
                    percentage_of_total=pct_tot,
                )
            )
        sec4.kelas_ibu_categories = ibu_cat_list
        sec4.kelas_ibu_participation_rate = round(
            (ibu_counts["Mengikuti (Ya)"]["total"] / denom_ibu) * 100.0, 1
        )

    # Matriks Korelasi Numerik 4x4
    corr_variables = [
        ("Berat Lahir (kg)", col_bbl),
        ("Panjang Lahir (cm)", col_pbl),
        ("Usia Balita (bln)", col_age),
        ("Z-Score TB/U", col_zs_tbu),
    ]
    sec4.correlation_variables = [item[0] for item in corr_variables]
    corr_cells: List[HeatmapCell] = []

    for v1_name, v1_col in corr_variables:
        for v2_name, v2_col in corr_variables:
            if v1_name == v2_name:
                corr_cells.append(
                    HeatmapCell(
                        row_var=v1_name,
                        col_var=v2_name,
                        correlation=1.0,
                        sample_size=len(section_rows),
                    )
                )
            elif not v1_col or not v2_col:
                corr_cells.append(
                    HeatmapCell(
                        row_var=v1_name,
                        col_var=v2_name,
                        correlation=None,
                        sample_size=0,
                    )
                )
            else:
                pairs_x: List[float] = []
                pairs_y: List[float] = []
                for r in section_rows:
                    x_val = _parse_numeric(r.get(v1_col))
                    y_val = _parse_numeric(r.get(v2_col))
                    if x_val is not None and y_val is not None:
                        pairs_x.append(x_val)
                        pairs_y.append(y_val)

                r_val = _compute_pearson_r(pairs_x, pairs_y)
                corr_cells.append(
                    HeatmapCell(
                        row_var=v1_name,
                        col_var=v2_name,
                        correlation=r_val,
                        sample_size=len(pairs_x),
                    )
                )

    sec4.correlation_cells = corr_cells

    # -------------------------------------------------------------------------
    # BAGIAN 5: Hubungan Faktor Ibu dan Kondisi Kelahiran terhadap Stunting
    # -------------------------------------------------------------------------
    sec5 = DashboardSection5MaternalFactors()

    # LiLA Ibu
    active_lila_col = col_lila or col_status_lila
    if not active_lila_col:
        sec5.has_lila = False
        sec5.lila_unmapped_reason = (
            "Variabel Lingkar Lengan Atas (LiLA) Ibu belum dipetakan dalam dataset. "
            "Standar Kemenkes RI menetapkan LiLA < 23,5 cm sebagai indikator risiko Kurang Energi Kronis (KEK)."
        )
    else:
        sec5.has_lila = True
        lila_groups = {
            "Berisiko KEK (< 23,5 cm)": {"total": 0, "stunting": 0},
            "Normal (≥ 23,5 cm)": {"total": 0, "stunting": 0},
        }
        total_lila_valid = 0

        for r in section_rows:
            is_kek = None
            if col_lila:
                l_num = _parse_numeric(r.get(col_lila))
                if l_num is not None and 10.0 <= l_num <= 50.0:
                    is_kek = l_num < 23.5
            elif col_status_lila:
                s_str = str(r.get(col_status_lila, "")).lower()
                if "kek" in s_str or "kurang" in s_str:
                    is_kek = True
                elif "normal" in s_str:
                    is_kek = False

            if is_kek is not None:
                cat_k = "Berisiko KEK (< 23,5 cm)" if is_kek else "Normal (≥ 23,5 cm)"
                lila_groups[cat_k]["total"] += 1
                total_lila_valid += 1
                if _is_stunting_row(r, col_tbu, col_zs_tbu) is True:
                    lila_groups[cat_k]["stunting"] += 1

        denom_lila = total_lila_valid if total_lila_valid > 0 else 1
        lila_cat_list: List[CategoryPrevalenceItem] = []
        for cat_k, stat in lila_groups.items():
            tot = stat["total"]
            st = stat["stunting"]
            st_rate = round((st / tot) * 100.0, 1) if tot > 0 else 0.0
            pct_tot = round((tot / denom_lila) * 100.0, 1)
            lila_cat_list.append(
                CategoryPrevalenceItem(
                    category=cat_k,
                    total_count=tot,
                    stunting_count=st,
                    normal_count=tot - st,
                    stunting_rate=st_rate,
                    percentage_of_total=pct_tot,
                )
            )
        sec5.lila_categories = lila_cat_list
        sec5.kek_risk_rate = round(
            (lila_groups["Berisiko KEK (< 23,5 cm)"]["total"] / denom_lila) * 100.0, 1
        )

    # BBLR categories untuk Bagian 5
    sec5.bblr_rate_overall = sec1.bblr_rate_overall
    sec5.bblr_categories = sec1.categories

    # Scatter Panjang Badan Lahir (PBL) vs Z-Score TB/U
    if not col_pbl:
        sec5.has_panjang_lahir = False
        sec5.panjang_lahir_unmapped_reason = (
            "Kolom Panjang Lahir (PBL) belum dipetakan dalam dataset."
        )
    else:
        sec5.has_panjang_lahir = True
        pbl_pairs: List[ScatterPoint] = []
        for r in section_rows:
            pbl_val = _parse_numeric(r.get(col_pbl))
            if pbl_val is not None and 25.0 <= pbl_val <= 65.0:
                zs_val = _parse_numeric(r.get(col_zs_tbu)) if col_zs_tbu else None
                if zs_val is not None and -8.0 <= zs_val <= 8.0:
                    is_stunt = _is_stunting_row(r, col_tbu, col_zs_tbu) is True
                    lbl = str(r.get(col_desa or col_pkm or col_kec, "Balita"))
                    pbl_pairs.append(
                        ScatterPoint(
                            x=round(pbl_val, 1),
                            y=round(zs_val, 2),
                            is_stunting=is_stunt,
                            label=lbl,
                        )
                    )

        if len(pbl_pairs) > 350:
            step = len(pbl_pairs) / 350
            sec5.scatter_panjang_sample = [pbl_pairs[int(i * step)] for i in range(350)]
        else:
            sec5.scatter_panjang_sample = pbl_pairs

    # -------------------------------------------------------------------------
    # DERET WAKTU BERANOTASI: Prevalensi Stunting Berdasarkan Periode Pengukuran
    # -------------------------------------------------------------------------
    time_series = DashboardTimeSeriesTrend()
    col_date = _find_source_col(mapping, "tanggal_ukur")
    if not col_date:
        time_series.has_date_column = False
        time_series.unmapped_reason = (
            "Kolom tanggal pengukuran belum dipetakan. "
            "Petakan kolom Tanggal Ukur pada menu Data Balita untuk menampilkan grafik deret waktu."
        )
    else:
        date_groups: Dict[Tuple[int, int], Dict[str, int]] = {}
        for r in section_rows:
            raw_d = r.get(col_date)
            if raw_d is not None:
                s_d = str(raw_d).strip()
                m_iso = re.match(r"^(\d{4})[-/](\d{1,2})", s_d)
                if m_iso:
                    y = int(m_iso.group(1))
                    m = int(m_iso.group(2))
                    if 1 <= m <= 12 and 1990 <= y <= 2100:
                        key = (y, m)
                        if key not in date_groups:
                            date_groups[key] = {"total": 0, "stunting": 0}
                        date_groups[key]["total"] += 1
                        if _is_stunting_row(r, col_tbu, col_zs_tbu) is True:
                            date_groups[key]["stunting"] += 1

        MONTH_NAMES_ID = {
            1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mei", 6: "Jun",
            7: "Jul", 8: "Agu", 9: "Sep", 10: "Okt", 11: "Nov", 12: "Des",
        }
        sorted_keys = sorted(date_groups.keys())

        if len(sorted_keys) < 2:
            time_series.has_date_column = True
            time_series.unmapped_reason = (
                f"Deret waktu memerlukan minimal 2 periode pengukuran untuk menampilkan tren "
                f"(saat ini dataset hanya memuat {len(sorted_keys)} periode pengukuran terdeteksi)."
            )
            time_series.points = [
                AnnotatedTimeSeriesPoint(
                    period_label=f"{MONTH_NAMES_ID.get(k[1], k[1])} {k[0]}",
                    total_measured=date_groups[k]["total"],
                    stunting_count=date_groups[k]["stunting"],
                    stunting_rate=round((date_groups[k]["stunting"] / date_groups[k]["total"]) * 100.0, 1) if date_groups[k]["total"] > 0 else 0.0,
                    annotation="Data Tunggal",
                )
                for k in sorted_keys
            ]
        else:
            time_series.has_date_column = True
            pts: List[AnnotatedTimeSeriesPoint] = []
            for k in sorted_keys:
                tot = date_groups[k]["total"]
                st = date_groups[k]["stunting"]
                rate = round((st / tot) * 100.0, 1) if tot > 0 else 0.0
                lbl = f"{MONTH_NAMES_ID.get(k[1], k[1])} {k[0]}"
                pts.append(
                    AnnotatedTimeSeriesPoint(
                        period_label=lbl,
                        total_measured=tot,
                        stunting_count=st,
                        stunting_rate=rate,
                    )
                )

            # Anotasi cerdas pada deret waktu
            max_rate_pt = max(pts, key=lambda p: p.stunting_rate)
            min_rate_pt = min(pts, key=lambda p: p.stunting_rate)
            max_vol_pt = max(pts, key=lambda p: p.total_measured)

            max_rate_pt.annotation = f"Puncak Stunting ({max_rate_pt.stunting_rate}%)"
            if min_rate_pt != max_rate_pt:
                min_rate_pt.annotation = f"Prevalensi Terendah ({min_rate_pt.stunting_rate}%)"
            if max_vol_pt != max_rate_pt and max_vol_pt != min_rate_pt:
                max_vol_pt.annotation = f"Sampel Terbesar ({max_vol_pt.total_measured} balita)"

            time_series.points = pts

    return DashboardTableauAnalytics(
        selected_desa_filter=desa_filter,
        section1_birth_weight=sec1,
        section2_age_cohort=sec2,
        section3_regional_spread=sec3,
        section4_posyandu_parenting=sec4,
        section5_maternal_factors=sec5,
        time_series_trend=time_series,
    )


def compute_dashboard_summary(desa_filter: Optional[str] = None) -> DashboardSummaryResponse:
    """
    Menghitung agregasi statistik aktual untuk Dashboard Utama berdasarkan dataset aktif.
    Memanfaatkan data yang sama dengan modul Visualisasi tanpa menduplikasi data mentah.
    Mendukung filter wilayah desa untuk Tableau Filter Action antar-visualisasi.
    """
    dataset = get_active_dataset()
    if not dataset or not dataset.get("rows"):
        return DashboardSummaryResponse(
            has_active_dataset=False,
            warnings=["Belum ada dataset balita aktif yang terhubung. Silakan unggah berkas melalui menu Data Balita."],
        )

    rows: List[Dict[str, Any]] = dataset["rows"]
    mapping: Dict[str, str] = dataset.get("column_mapping", {})
    filename: str = dataset.get("filename", "dataset_balita")
    preview_res: Optional[DatasetPreviewResponse] = dataset.get("preview_response")

    # Identifikasi kolom sumber untuk setiap standar
    col_tbu = _find_source_col(mapping, "status_tb_u")
    col_bbu = _find_source_col(mapping, "status_bb_u")
    col_bbtb = _find_source_col(mapping, "status_bb_tb")
    col_gender = _find_source_col(mapping, "jenis_kelamin")
    col_kec = _find_source_col(mapping, "kecamatan")
    col_pkm = _find_source_col(mapping, "puskesmas")
    col_desa = _find_source_col(mapping, "desa_kelurahan")
    col_date = _find_source_col(mapping, "tanggal_ukur")
    col_age = _find_source_col(mapping, "usia_saat_ukur")
    col_weight = _find_source_col(mapping, "berat_badan")
    col_height = _find_source_col(mapping, "tinggi_badan")
    col_zs_tbu = _find_source_col(mapping, "zscore_tb_u")

    total_records = len(rows)
    valid_records = 0
    in_scope_balita_count = 0
    out_of_scope_age_count = 0
    out_of_range_count = 0

    row_validity: List[bool] = []
    for r in rows:
        is_valid = True
        has_range_issue = False

        if not col_age or not col_height or not col_weight:
            is_valid = False
            has_range_issue = True

        if col_age:
            parsed_age = _parse_numeric(r.get(col_age))
            if parsed_age is None or parsed_age < 0 or parsed_age > 120:
                is_valid = False
                has_range_issue = True
            else:
                if parsed_age < 60:
                    in_scope_balita_count += 1
                else:
                    out_of_scope_age_count += 1

        if col_height:
            parsed_h = _parse_numeric(r.get(col_height))
            if parsed_h is None or parsed_h < 30 or parsed_h > 150:
                is_valid = False
                has_range_issue = True

        if col_weight:
            parsed_w = _parse_numeric(r.get(col_weight))
            if parsed_w is None or parsed_w < 1.0 or parsed_w > 40.0:
                is_valid = False
                has_range_issue = True

        if is_valid:
            valid_records += 1
        if has_range_issue:
            out_of_range_count += 1
        row_validity.append(is_valid)

    need_check_records = max(0, total_records - valid_records)
    valid_percentage = round((valid_records / total_records) * 100, 1) if total_records > 0 else 0.0
    need_check_percentage = round((need_check_records / total_records) * 100, 1) if total_records > 0 else 0.0

    # Wilayah
    all_kec = sorted({str(r.get(col_kec)).strip() for r in rows if col_kec and r.get(col_kec) and str(r.get(col_kec)).strip() not in ["-", "null", "none"]})
    all_pkm = sorted({str(r.get(col_pkm)).strip() for r in rows if col_pkm and r.get(col_pkm) and str(r.get(col_pkm)).strip() not in ["-", "null", "none"]})
    all_desa = sorted({str(r.get(col_desa)).strip() for r in rows if col_desa and r.get(col_desa) and str(r.get(col_desa)).strip() not in ["-", "null", "none"]})

    has_region = bool(col_kec or col_pkm or col_desa)
    region_label_used = "kecamatan" if col_kec else ("puskesmas" if col_pkm else ("desa" if col_desa else "wilayah"))
    active_reg_col = col_kec or col_pkm or col_desa

    region_summary: List[DashboardRegionSummaryItem] = []
    if active_reg_col:
        reg_map: Dict[str, Dict[str, int]] = {}
        for r in rows:
            v_reg = str(r.get(active_reg_col, "")).strip()
            if not v_reg or v_reg in ["-", "null", "none"]:
                continue
            if v_reg not in reg_map:
                reg_map[v_reg] = {"count": 0, "stunting": 0}
            reg_map[v_reg]["count"] += 1
            if col_tbu and "pendek" in str(r.get(col_tbu, "")).strip().lower():
                reg_map[v_reg]["stunting"] += 1

        denom_r = total_records if total_records > 0 else 1
        sorted_reg = sorted(reg_map.items(), key=lambda x: x[1]["count"], reverse=True)
        for name, data in sorted_reg[:8]:
            pct = round((data["count"] / denom_r) * 100, 1)
            region_summary.append(
                DashboardRegionSummaryItem(
                    nama=name,
                    count=data["count"],
                    percentage=pct,
                    stunting_count=data["stunting"] if col_tbu else None,
                )
            )

    # Status Stunting (TB/U)
    has_status_tbu = False
    status_tbu_unmapped_reason = None
    stunted_count = 0
    stunted_percentage = 0.0
    tbu_distribution: List[DistributionItem] = []

    if col_tbu is None:
        has_status_tbu = False
        status_tbu_unmapped_reason = "Kolom status stunting (TB/U) belum dipetakan dalam dataset aktif."
    else:
        has_status_tbu = True
        tbu_counts: Dict[str, int] = {}
        valid_tbu_total = 0
        for r in rows:
            raw_val = str(r.get(col_tbu, "")).strip()
            if not raw_val or raw_val in ["-", "null", "none", "nan"]:
                continue
            valid_tbu_total += 1
            tbu_counts[raw_val] = tbu_counts.get(raw_val, 0) + 1
            if "pendek" in raw_val.lower():
                stunted_count += 1

        if valid_tbu_total > 0:
            stunted_percentage = round((stunted_count / valid_tbu_total) * 100, 1)

        standard_tbu_order = ["Sangat Pendek", "Pendek", "Normal", "Tinggi"]
        sorted_tbu_keys = sorted(
            tbu_counts.keys(),
            key=lambda k: standard_tbu_order.index(k) if k in standard_tbu_order else 99,
        )
        for cat in sorted_tbu_keys:
            cnt = tbu_counts[cat]
            pct = round((cnt / valid_tbu_total) * 100, 1) if valid_tbu_total > 0 else 0.0
            tbu_distribution.append(DistributionItem(category=cat, count=cnt, percentage=pct))

    # BB/U & BB/TB
    has_status_bbu = False
    bbu_distribution: List[DistributionItem] = []
    if col_bbu is not None:
        has_status_bbu = True
        bbu_counts: Dict[str, int] = {}
        v_bbu_tot = 0
        for r in rows:
            raw_v = str(r.get(col_bbu, "")).strip()
            if not raw_v or raw_v in ["-", "null", "none", "nan"]:
                continue
            v_bbu_tot += 1
            bbu_counts[raw_v] = bbu_counts.get(raw_v, 0) + 1
        for cat, cnt in bbu_counts.items():
            pct = round((cnt / v_bbu_tot) * 100, 1) if v_bbu_tot > 0 else 0.0
            bbu_distribution.append(DistributionItem(category=cat, count=cnt, percentage=pct))

    has_status_bbtb = False
    bbtb_distribution: List[DistributionItem] = []
    if col_bbtb is not None:
        has_status_bbtb = True
        bbtb_counts: Dict[str, int] = {}
        v_bbtb_tot = 0
        for r in rows:
            raw_v = str(r.get(col_bbtb, "")).strip()
            if not raw_v or raw_v in ["-", "null", "none", "nan"]:
                continue
            v_bbtb_tot += 1
            bbtb_counts[raw_v] = bbtb_counts.get(raw_v, 0) + 1
        for cat, cnt in bbtb_counts.items():
            pct = round((cnt / v_bbtb_tot) * 100, 1) if v_bbtb_tot > 0 else 0.0
            bbtb_distribution.append(DistributionItem(category=cat, count=cnt, percentage=pct))

    # Usia & Gender
    has_age = False
    age_distribution: List[DistributionItem] = []
    if col_age is not None:
        has_age = True
        age_counts = {
            "0–5 bln": 0,
            "6–11 bln": 0,
            "12–23 bln": 0,
            "24–35 bln": 0,
            "36–47 bln": 0,
            "48–59 bln": 0,
        }
        for r in rows:
            parsed_a = _parse_numeric(r.get(col_age))
            if parsed_a is not None and 0 <= parsed_a < 60:
                grp_lbl = _get_age_group_label(parsed_a)
                if grp_lbl in age_counts:
                    age_counts[grp_lbl] += 1
        denom_balita = in_scope_balita_count if in_scope_balita_count > 0 else 1
        for grp in ["0–5 bln", "6–11 bln", "12–23 bln", "24–35 bln", "36–47 bln", "48–59 bln"]:
            cnt = age_counts.get(grp, 0)
            pct = round((cnt / denom_balita) * 100, 1)
            age_distribution.append(DistributionItem(category=grp, count=cnt, percentage=pct))
        if out_of_scope_age_count > 0:
            tot_a = in_scope_balita_count + out_of_scope_age_count
            age_distribution.append(
                DistributionItem(
                    category="Di luar cakupan (≥ 60 bln)",
                    count=out_of_scope_age_count,
                    percentage=round((out_of_scope_age_count / tot_a) * 100, 1) if tot_a > 0 else 0.0,
                )
            )

    has_gender = False
    gender_distribution: List[DistributionItem] = []
    if col_gender is not None:
        has_gender = True
        g_counts: Dict[str, int] = {}
        tot_g = 0
        for r in rows:
            raw_g = str(r.get(col_gender, "")).strip()
            if not raw_g or raw_g in ["-", "null", "none"]:
                continue
            norm_g = raw_g.upper()
            if norm_g in ["L", "LAKI-LAKI", "LAKI", "MALE", "M"]:
                lbl = "Laki-laki (L)"
            elif norm_g in ["P", "PEREMPUAN", "WANITA", "FEMALE", "F"]:
                lbl = "Perempuan (P)"
            else:
                lbl = raw_g
            g_counts[lbl] = g_counts.get(lbl, 0) + 1
            tot_g += 1
        for lbl, cnt in g_counts.items():
            pct = round((cnt / tot_g) * 100, 1) if tot_g > 0 else 0.0
            gender_distribution.append(DistributionItem(category=lbl, count=cnt, percentage=pct))

    # Tren Pengukuran (Tanggal)
    has_date_trend = False
    date_trend_unmapped_reason = None
    monthly_trend: List[DashboardMonthlyTrendItem] = []

    MONTH_NAMES_ID = {
        1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mei", 6: "Jun",
        7: "Jul", 8: "Agu", 9: "Sep", 10: "Okt", 11: "Nov", 12: "Des",
    }

    if col_date is None:
        date_trend_unmapped_reason = "Kolom tanggal pengukuran belum dipetakan dalam dataset aktif."
    else:
        date_group_map: Dict[Tuple[int, int], Dict[str, Any]] = {}
        for idx, r in enumerate(rows):
            raw_d = r.get(col_date)
            parsed_dt = None
            if raw_d is not None:
                s_d = str(raw_d).strip()
                m_iso = re.match(r"^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?", s_d)
                if m_iso:
                    y = int(m_iso.group(1))
                    m = int(m_iso.group(2))
                    if 1 <= m <= 12 and 1990 <= y <= 2100:
                        parsed_dt = (y, m)
                else:
                    m_dmy = re.match(r"^\d{1,2}[-/](\d{1,2})[-/](\d{4})", s_d)
                    if m_dmy:
                        m = int(m_dmy.group(1))
                        y = int(m_dmy.group(2))
                        if 1 <= m <= 12 and 1990 <= y <= 2100:
                            parsed_dt = (y, m)

            if parsed_dt:
                if parsed_dt not in date_group_map:
                    date_group_map[parsed_dt] = {"tercatat": 0, "valid": 0}
                date_group_map[parsed_dt]["tercatat"] += 1
                if row_validity[idx]:
                    date_group_map[parsed_dt]["valid"] += 1

        if date_group_map:
            has_date_trend = True
            sorted_dates = sorted(date_group_map.keys())
            years_present = {k[0] for k in sorted_dates}
            is_single_year = len(years_present) <= 1
            for y, m in sorted_dates:
                lbl = MONTH_NAMES_ID.get(m, str(m)) if is_single_year else f"{MONTH_NAMES_ID.get(m, str(m))} {y}"
                monthly_trend.append(
                    DashboardMonthlyTrendItem(
                        bulan=lbl,
                        tercatat=date_group_map[(y, m)]["tercatat"],
                        valid=date_group_map[(y, m)]["valid"],
                    )
                )
        else:
            has_date_trend = False
            date_trend_unmapped_reason = "Kolom tanggal pengukuran tidak memuat data format tanggal yang dapat diurai."

    # Faktor Risiko:
    # Mematuhi prinsip: Jangan membuat statistik faktor risiko dari data fiktif
    has_risk_factors = False
    risk_factors_unmapped_reason = (
        "Variabel determinan faktor risiko (seperti ASI Eksklusif, Sanitasi Air Bersih, Imunisasi) "
        "belum tersedia pada dataset saat ini dan sedang menunggu konfirmasi skema final Dinas Kesehatan."
    )
    risk_factors: List[DashboardRiskFactorItem] = []

    # Format Sampel Pratinjau Baris (Maksimal 6 baris dari data riil dengan PII tersamar)
    preview_rows: List[Dict[str, Any]] = []
    preview_headers: List[str] = [
        "kodeAnak", "usia", "jenisKelamin", "beratBadan", "tinggiBadan", "wilayah", "statusData"
    ]

    for idx, r in enumerate(rows[:6]):
        parsed_age = _parse_numeric(r.get(col_age)) if col_age else None
        parsed_w = _parse_numeric(r.get(col_weight)) if col_weight else None
        parsed_h = _parse_numeric(r.get(col_height)) if col_height else None

        val_kec = r.get(col_kec) if col_kec else None
        val_pkm = r.get(col_pkm) if col_pkm else None
        val_desa = r.get(col_desa) if col_desa else None
        reg_val = str(val_kec or val_pkm or val_desa or "-").strip()

        raw_gender = r.get(col_gender) if col_gender else None
        g_val = str(raw_gender or "-").strip().upper()
        norm_g = "L" if g_val in ["L", "LAKI-LAKI", "LAKI"] else ("P" if g_val in ["P", "PEREMPUAN", "WANITA"] else g_val)

        row_status = "Valid" if row_validity[idx] else "Perlu Diperiksa"
        raw_tbu = r.get(col_tbu) if col_tbu else None
        status_stunting = str(raw_tbu or "-").strip() if raw_tbu else "-"

        preview_rows.append({
            "id": str(idx + 1),
            "kodeAnak": f"BLT-{idx + 1:03d}",
            "usia": int(parsed_age) if parsed_age is not None else 0,
            "jenisKelamin": norm_g,
            "beratBadan": round(parsed_w, 1) if parsed_w is not None else 0.0,
            "tinggiBadan": round(parsed_h, 1) if parsed_h is not None else 0.0,
            "wilayah": reg_val,
            "statusData": row_status,
            "statusStunting": status_stunting,
        })

    readiness_status = preview_res.readiness_status if preview_res else "siap_analisis"
    readiness_message = preview_res.readiness_message if preview_res else None

    # Kualitas dan Kelengkapan Data
    total_quality_issues = len(preview_res.quality_issues) if preview_res else 0
    duplicates_count = preview_res.identical_duplicates_count if preview_res else 0
    repeat_measurements_count = preview_res.potential_repeat_measurements_count if preview_res else 0
    missing_values_count = sum(c.null_count for c in preview_res.columns) if preview_res else 0

    required_antropometri_keys = ["usia_saat_ukur", "jenis_kelamin", "berat_badan", "tinggi_badan", "status_tb_u"]
    mapped_targets = set(mapping.values())
    unmapped_required_columns = [k for k in required_antropometri_keys if k not in mapped_targets]

    quality_highlights: List[str] = []
    if duplicates_count > 0:
        quality_highlights.append(f"{duplicates_count} baris duplikasi identik terdeteksi pada dataset")
    if out_of_scope_age_count > 0:
        quality_highlights.append(f"{out_of_scope_age_count} catatan anak berusia ≥ 60 bulan (di luar cakupan kohor balita 0–59 bln)")
    if out_of_range_count > 0:
        quality_highlights.append(f"{out_of_range_count} entri memuat nilai antropometri di luar rentang biologis wajar")
    if missing_values_count > 0:
        quality_highlights.append(f"{missing_values_count} nilai sel kosong pada berbagai atribut data balita")
    if unmapped_required_columns:
        quality_highlights.append(f"{len(unmapped_required_columns)} variabel wajib antropometri belum dipetakan")
    if not quality_highlights:
        quality_highlights.append("Seluruh catatan lulus pemeriksaan dasar rentang nilai dan kelengkapan atribut")

    warnings: List[str] = []
    if out_of_scope_age_count > 0:
        warnings.append(
            f"Terdapat {out_of_scope_age_count} data anak dengan usia ≥ 60 bulan yang berada di luar cakupan balita penelitian (0–59 bulan)."
        )
    if not has_status_tbu:
        warnings.append("Status stunting (TB/U) belum dapat disajikan karena kolom TB/U belum dipetakan.")
    if not has_date_trend:
        warnings.append("Grafik tren bulanan belum dapat ditampilkan karena kolom tanggal pengukuran belum dipetakan.")

    updated_at = dataset.get("updated_at")

    tableau_analytics = _compute_dashboard_tableau_analytics(
        all_rows=rows,
        mapping=mapping,
        col_tbu=col_tbu,
        col_zs_tbu=col_zs_tbu,
        col_age=col_age,
        col_kec=col_kec,
        col_pkm=col_pkm,
        col_desa=col_desa,
        desa_filter=desa_filter,
    )

    return DashboardSummaryResponse(
        has_active_dataset=True,
        filename=filename,
        updated_at=updated_at,
        total_records=total_records,
        valid_records=valid_records,
        need_check_records=need_check_records,
        valid_percentage=valid_percentage,
        need_check_percentage=need_check_percentage,
        has_region=has_region,
        total_kecamatan=len(all_kec),
        total_puskesmas=len(all_pkm),
        total_desa=len(all_desa),
        region_label_used=region_label_used,
        region_summary=region_summary,
        has_status_tbu=has_status_tbu,
        status_tbu_unmapped_reason=status_tbu_unmapped_reason,
        stunted_count=stunted_count,
        stunted_percentage=stunted_percentage,
        tbu_distribution=tbu_distribution,
        has_status_bbu=has_status_bbu,
        bbu_distribution=bbu_distribution,
        has_status_bbtb=has_status_bbtb,
        bbtb_distribution=bbtb_distribution,
        has_age=has_age,
        in_scope_balita_count=in_scope_balita_count,
        out_of_scope_age_count=out_of_scope_age_count,
        age_distribution=age_distribution,
        has_gender=has_gender,
        gender_distribution=gender_distribution,
        has_date_trend=has_date_trend,
        date_trend_unmapped_reason=date_trend_unmapped_reason,
        monthly_trend=monthly_trend,
        has_risk_factors=has_risk_factors,
        risk_factors_unmapped_reason=risk_factors_unmapped_reason,
        risk_factors=risk_factors,
        total_quality_issues=total_quality_issues,
        missing_values_count=missing_values_count,
        duplicates_count=duplicates_count,
        repeat_measurements_count=repeat_measurements_count,
        out_of_range_count=out_of_range_count,
        unmapped_required_columns=unmapped_required_columns,
        quality_highlights=quality_highlights,
        preview_rows=preview_rows,
        preview_headers=preview_headers,
        readiness_status=readiness_status,
        readiness_message=readiness_message,
        warnings=warnings,
        tableau_analytics=tableau_analytics,
    )
