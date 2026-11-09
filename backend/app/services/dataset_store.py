"""
Penyimpan dataset aktif dalam memori backend dan mesin komputasi visualisasi data balita (Stage 4.1).
Menjaga konsistensi data antara frontend dan backend tanpa duplikasi kalkulasi.
Mendukung kalkulasi komprehensif: TB/U, BB/U, BB/TB, kelompok usia, jenis kelamin,
distribusi wilayah, dan statistik Z-score.
"""
import re
import statistics
from typing import List, Dict, Any, Optional
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
    }


def get_active_dataset() -> Optional[Dict[str, Any]]:
    """Mengambil dataset aktif saat ini."""
    return _ACTIVE_DATASET


def update_active_mapping(mapping: Dict[str, str]) -> None:
    """Memperbarui pemetaan kolom pada dataset aktif."""
    global _ACTIVE_DATASET
    if _ACTIVE_DATASET:
        _ACTIVE_DATASET["column_mapping"] = mapping


def clear_active_dataset() -> None:
    """Mengosongkan dataset aktif dari memori."""
    global _ACTIVE_DATASET
    _ACTIVE_DATASET = None


def _find_source_col(column_mapping: Dict[str, str], standard_key: str) -> Optional[str]:
    """Mencari nama kolom sumber yang dipetakan ke kunci standar tertentu."""
    for src, tgt in column_mapping.items():
        if tgt == standard_key:
            return src
    return None


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
    )


def compute_dashboard_summary() -> DashboardSummaryResponse:
    """
    Menghitung agregasi statistik aktual untuk Dashboard Utama berdasarkan dataset aktif.
    Memanfaatkan data yang sama dengan modul Visualisasi tanpa menduplikasi data mentah.
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

    total_records = len(rows)
    valid_records = 0
    in_scope_balita_count = 0
    out_of_scope_age_count = 0

    row_validity: List[bool] = []
    for r in rows:
        is_valid = True
        parsed_age = _parse_numeric(r.get(col_age)) if col_age else None
        if col_age:
            if parsed_age is None or parsed_age < 0 or parsed_age > 120:
                is_valid = False
            else:
                if parsed_age < 60:
                    in_scope_balita_count += 1
                else:
                    out_of_scope_age_count += 1

        if col_height:
            parsed_h = _parse_numeric(r.get(col_height))
            if parsed_h is None or parsed_h < 30 or parsed_h > 150:
                is_valid = False

        if col_weight:
            parsed_w = _parse_numeric(r.get(col_weight))
            if parsed_w is None or parsed_w < 1.0 or parsed_w > 40.0:
                is_valid = False

        if is_valid:
            valid_records += 1
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
    has_status_tbu = col_tbu is not None
    status_tbu_unmapped_reason = None
    stunted_count = 0
    stunted_percentage = 0.0
    tbu_distribution: List[DistributionItem] = []

    if not has_status_tbu:
        status_tbu_unmapped_reason = "Kolom status stunting (TB/U) belum dipetakan dalam dataset aktif."
    else:
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
    has_status_bbu = col_bbu is not None
    bbu_distribution: List[DistributionItem] = []
    if has_status_bbu:
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

    has_status_bbtb = col_bbtb is not None
    bbtb_distribution: List[DistributionItem] = []
    if has_status_bbtb:
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
    has_age = col_age is not None
    age_distribution: List[DistributionItem] = []
    if has_age:
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

    has_gender = col_gender is not None
    gender_distribution: List[DistributionItem] = []
    if has_gender:
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

    if not col_date:
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
        reg_val = str(r.get(col_kec) or r.get(col_pkm) or r.get(col_desa) or "-").strip()
        g_val = str(r.get(col_gender, "-")).strip().upper()
        norm_g = "L" if g_val in ["L", "LAKI-LAKI", "LAKI"] else ("P" if g_val in ["P", "PEREMPUAN", "WANITA"] else g_val)

        row_status = "Valid" if row_validity[idx] else "Perlu Diperiksa"

        preview_rows.append({
            "id": str(idx + 1),
            "kodeAnak": f"BLT-{idx + 1:03d}",
            "usia": int(parsed_age) if parsed_age is not None else 0,
            "jenisKelamin": norm_g,
            "beratBadan": round(parsed_w, 1) if parsed_w is not None else 0.0,
            "tinggiBadan": round(parsed_h, 1) if parsed_h is not None else 0.0,
            "wilayah": reg_val,
            "statusData": row_status,
            "statusStunting": str(r.get(col_tbu) or "-").strip() if col_tbu else "-",
        })

    readiness_status = preview_res.readiness_status if preview_res else "siap_analisis"
    readiness_message = preview_res.readiness_message if preview_res else None

    warnings: List[str] = []
    if out_of_scope_age_count > 0:
        warnings.append(
            f"Terdapat {out_of_scope_age_count} data anak dengan usia ≥ 60 bulan yang berada di luar cakupan balita penelitian (0–59 bulan)."
        )
    if not has_status_tbu:
        warnings.append("Status stunting (TB/U) belum dapat disajikan karena kolom TB/U belum dipetakan.")
    if not has_date_trend:
        warnings.append("Grafik tren bulanan belum dapat ditampilkan karena kolom tanggal pengukuran belum dipetakan.")

    return DashboardSummaryResponse(
        has_active_dataset=True,
        filename=filename,
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
        preview_rows=preview_rows,
        preview_headers=preview_headers,
        readiness_status=readiness_status,
        readiness_message=readiness_message,
        warnings=warnings,
    )
