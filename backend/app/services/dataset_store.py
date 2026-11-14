
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from statistics import mean, median
from typing import Any, Optional
import math

from app.schemas.data_management import DatasetPreviewResponse

from app.schemas.dashboard import (
    AgeCohortItem,
    AnnotatedTimeSeriesPoint,
    BoxPlotStats,
    CategoryPrevalenceItem,
    DashboardMonthlyTrendItem,
    DashboardRegionSummaryItem,
    DashboardRiskFactorItem,
    DashboardSection1BirthWeight,
    DashboardSection2AgeCohort,
    DashboardSection3RegionalSpread,
    DashboardSection4PosyanduParenting,
    DashboardSection5MaternalFactors,
    DashboardSummaryResponse,
    DashboardTableauAnalytics,
    DashboardTimeSeriesTrend,
    DesaSpreadItem,
    KecamatanSpreadItem,
    HeatmapCell,
    ScatterPoint,
)

from app.schemas.visualization import (
    DistributionItem,
    FilterOptions,
    RegionDistributionItem,
    SummaryStats,
    VisualizationFilterRequest,
    VisualizationResponse,
    ZScoreStats,
)

from app.services import analysis_engine as eng


# Dataset aktif disimpan sementara dalam memori backend
_ACTIVE_DATASET: Optional[dict[str, Any]] = None


# ============================================================
# 1. PENGELOLAAN DATASET AKTIF
# ============================================================

def set_active_dataset(
    filename: str,
    file_type: str,
    headers: list[str],
    rows: list[dict[str, Any]],
    preview_response: DatasetPreviewResponse,
    column_mapping: Optional[dict[str, str]] = None,
) -> None:
    """Mengaktifkan dataset yang baru diunggah."""

    global _ACTIVE_DATASET

    mapping = dict(column_mapping or {})

    if not mapping:
        mapping = {
            col.name: col.suggested_mapping
            for col in preview_response.columns
            if col.suggested_mapping
        }

    # Model lama tidak boleh digunakan dengan dataset baru
    from app.services.ml_service import TRAIN_STATE
    TRAIN_STATE.clear()

    _ACTIVE_DATASET = {
        "filename": filename,
        "file_type": file_type,
        "headers": headers,
        "rows": rows,
        "preview_response": preview_response,
        "column_mapping": mapping,
        "updated_at": datetime.now().strftime(
            "%d %b %Y, %H:%M WIB"
        ),
    }


def get_active_dataset() -> Optional[dict[str, Any]]:
    """Mengambil dataset yang sedang aktif."""
    return _ACTIVE_DATASET


def update_active_mapping(
    mapping: dict[str, str]
) -> None:
    """Memperbarui pemetaan kolom dataset aktif."""

    if _ACTIVE_DATASET is not None:
        from app.services.ml_service import TRAIN_STATE

        TRAIN_STATE.clear()

        _ACTIVE_DATASET["column_mapping"] = dict(mapping)

        _ACTIVE_DATASET["updated_at"] = (
            datetime.now().strftime("%d %b %Y, %H:%M WIB")
        )


def clear_active_dataset() -> None:
    """Menghapus dataset aktif dari memori."""

    global _ACTIVE_DATASET

    from app.services.ml_service import TRAIN_STATE

    TRAIN_STATE.clear()
    _ACTIVE_DATASET = None


# ============================================================
# 2. FUNGSI BANTUAN
# ============================================================

def _find_source_col(
    mapping: dict[str, str],
    key: str
) -> Optional[str]:
    return eng.source(mapping, key)


def _parse_numeric(value: Any) -> Optional[float]:
    return eng.number(value)


def _get_age_group_label(age: float) -> str:
    result = eng.group_age(age)

    if result:
        return f"{result.replace('-', '–')} bln"

    return "Di luar cakupan (≥ 60 bln)"


def _matches_age_group(
    age: float,
    group: str
) -> bool:
    target = (
        group.lower()
        .replace("–", "-")
        .replace("bln", "")
        .replace("bulan", "")
        .replace(" ", "")
    )

    if target in {"60+", "60", ">=60"} or "luar" in target:
        return age >= 60

    return eng.group_age(age) == target


def _percent(
    value: int | float,
    total: int | float
) -> float:
    if not total:
        return 0.0

    return round(
        value * 100.0 / total,
        1
    )


def _is_stunting_row(
    row: dict[str, Any],
    col_tbu: Optional[str],
    col_zs_tbu: Optional[str],
    col_binary: Optional[str] = None,
) -> Optional[bool]:
    """
    Menggunakan mesin label yang sama dengan Dashboard
    dan modul Data Analitik.
    """

    mapping = {}

    if col_tbu:
        mapping[col_tbu] = "status_tb_u"

    if col_zs_tbu:
        mapping[col_zs_tbu] = "zscore_tb_u"

    if col_binary:
        mapping[col_binary] = "status_stunting"

    return eng.target_status(row, mapping)[0]


def _distribution(
    values: list[str]
) -> list[DistributionItem]:
    counts = Counter(values)

    return [
        DistributionItem(
            category=k,
            count=v,
            percentage=_percent(v, len(values)),
        )

        for k, v in sorted(counts.items())
    ]


def _percentile(
    values: list[float],
    p: float
) -> float:
    ordered = sorted(values)

    pos = (len(ordered) - 1) * p

    low = math.floor(pos)
    high = math.ceil(pos)

    return (
        ordered[low]
        + (ordered[high] - ordered[low])
        * (pos - low)
    )


def _compute_boxplot(
    values: list[float]
) -> Optional[BoxPlotStats]:
    if not values:
        return None

    return BoxPlotStats(
        min_value=round(min(values), 2),
        q1=round(_percentile(values, 0.25), 2),
        median=round(_percentile(values, 0.50), 2),
        q3=round(_percentile(values, 0.75), 2),
        max_value=round(max(values), 2),
        mean=round(mean(values), 2),
        count=len(values),
    )


def _compute_pearson_r(
    xs: list[float],
    ys: list[float]
) -> Optional[float]:
    if len(xs) < 3 or len(xs) != len(ys):
        return None

    avx = mean(xs)
    avy = mean(ys)

    numerator = sum(
        (x - avx) * (y - avy)
        for x, y in zip(xs, ys)
    )

    dx = sum(
        (x - avx) ** 2
        for x in xs
    )

    dy = sum(
        (y - avy) ** 2
        for y in ys
    )

    if dx and dy:
        return round(
            numerator / math.sqrt(dx * dy),
            3
        )

    return 0.0


# ============================================================
# 3. STATISTIK Z-SCORE
# ============================================================

def _compute_zscore_stats(
    rows: list[dict[str, Any]],
    col: Optional[str],
    name: str
) -> ZScoreStats:

    if not col:
        return ZScoreStats(
            has_column=False,
            unmapped_reason=(
                f"Kolom Z-Score {name} belum dipetakan."
            ),
        )

    values = [
        num

        for row in rows

        if (
            (num := eng.number(row.get(col))) is not None
            and -10 <= num <= 10
        )
    ]

    if not values:
        return ZScoreStats(
            has_column=True,
            count_valid=0,
            unmapped_reason=(
                f"Kolom Z-Score {name} "
                "tidak memiliki nilai valid."
            ),
        )

    bins = [
        ("< -3 SD", lambda x: x < -3),
        ("-3 s/d -2 SD", lambda x: -3 <= x < -2),
        ("-2 s/d -1 SD", lambda x: -2 <= x < -1),
        ("-1 s/d 0 SD", lambda x: -1 <= x < 0),
        ("0 s/d +1 SD", lambda x: 0 <= x < 1),
        ("+1 s/d +2 SD", lambda x: 1 <= x <= 2),
        ("> +2 SD", lambda x: x > 2),
    ]

    dist = [
        DistributionItem(
            category=label,

            count=sum(
                check(v)
                for v in values
            ),

            percentage=_percent(
                sum(check(v) for v in values),
                len(values)
            ),
        )

        for label, check in bins
    ]

    return ZScoreStats(
        has_column=True,
        count_valid=len(values),
        mean=round(mean(values), 2),
        median=round(median(values), 2),
        min_value=round(min(values), 2),
        max_value=round(max(values), 2),
        distribution=dist,
    )


# ============================================================
# 4. KELOMPOK USIA DAN JENIS KELAMIN
# ============================================================

def _age_counts(
    rows: list[dict[str, Any]],
    mapping: dict[str, str]
) -> tuple[list[DistributionItem], int, int, int]:

    col = eng.source(mapping, "usia_saat_ukur")

    if not col:
        return [], 0, 0, 0

    known: Counter[str] = Counter()

    valid = 0
    in_scope = 0
    outside = 0

    for row in rows:
        age = eng.number(row.get(col))

        if age is None or age < 0:
            continue

        valid += 1

        if age < 60:
            in_scope += 1

            known[
                _get_age_group_label(age)
            ] += 1

        else:
            outside += 1

    groups = [
        "0–5 bln",
        "6–11 bln",
        "12–23 bln",
        "24–35 bln",
        "36–47 bln",
        "48–59 bln",
    ]

    result = [
        DistributionItem(
            category=g,
            count=known[g],
            percentage=_percent(
                known[g],
                in_scope
            ),
        )

        for g in groups
    ]

    if outside:
        result.append(
            DistributionItem(
                category="Di luar cakupan (≥ 60 bln)",
                count=outside,
                percentage=_percent(
                    outside,
                    in_scope + outside
                ),
            )
        )

    return result, valid, in_scope, outside


def _gender_label(
    value: Any
) -> Optional[str]:
    gender = eng.normalize_gender(value)

    if gender == "L":
        return "Laki-laki (L)"

    if gender == "P":
        return "Perempuan (P)"

    return gender


# ============================================================
# 5. DISTRIBUSI STATUS STUNTING
# ============================================================

def _status_distribution(
    rows: list[dict[str, Any]],
    mapping: dict[str, str]
) -> list[DistributionItem]:

    col = eng.source(mapping, "status_tb_u")

    tally = []

    for row in rows:
        label, conflict = eng.target_status(
            row,
            mapping
        )

        if label is None or conflict:
            continue

        if col and eng.present(row.get(col)):
            tally.append(
                eng.text_value(row[col])
            )

        else:
            tally.append(
                "Stunting"
                if label
                else "Tidak Stunting"
            )

    result = _distribution(tally)

    order = {
        "Sangat Pendek": 0,
        "Pendek": 1,
        "Normal": 2,
        "Tinggi": 3,
    }

    return sorted(
        result,
        key=lambda x: (
            order.get(x.category, 100),
            x.category
        ),
    )


def _other_distribution(
    rows: list[dict[str, Any]],
    col: Optional[str]
) -> list[DistributionItem]:

    if not col:
        return []

    return _distribution([
        eng.text_value(row.get(col))

        for row in rows

        if eng.present(row.get(col))
    ])


# ============================================================
# 6. DISTRIBUSI WILAYAH
# ============================================================

def _region_summary(
    rows: list[dict[str, Any]],
    mapping: dict[str, str],
    region_key: str
):
    groups = defaultdict(
        lambda: {
            "total": 0,
            "stunting": 0,
            "normal": 0,
        }
    )

    for row in rows:
        name = eng.value(
            row,
            mapping,
            region_key
        )

        if not eng.present(name):
            continue

        group = groups[
            eng.text_value(name)
        ]

        group["total"] += 1

        label, conflict = eng.target_status(
            row,
            mapping
        )

        if label is not None and not conflict:
            group[
                "stunting" if label else "normal"
            ] += 1

    return groups


def _filtered_data(
    rows: list[dict[str, Any]],
    mapping: dict[str, str],
    req: VisualizationFilterRequest
):
    return eng.filtered_rows(
        rows,
        mapping,
        {
            "kecamatan": req.kecamatan,
            "puskesmas": req.puskesmas,
            "desa_kelurahan": req.desa_kelurahan,
            "jenis_kelamin": req.jenis_kelamin,
            "age_group": req.age_group,
            "status_stunting": req.status_stunting,
            "periode": req.periode,
        },
    )


# ============================================================
# 7. VALIDASI DASAR DATASET
# ============================================================

def _row_basic_valid(
    row: dict[str, Any],
    mapping: dict[str, str]
) -> bool:
    """
    Pemeriksaan dasar atribut usia dan tinggi badan.

    Validasi lengkap dilakukan pada tahap audit/ETL.
    """

    for key, low, high in (
        ("usia_saat_ukur", 0, 120),
        ("tinggi_badan", 30, 150),
    ):
        col = eng.source(mapping, key)

        if col:
            value = eng.number(
                row.get(col)
            )

            if (
                value is None
                or not low <= value <= high
            ):
                return False

    return True


# ============================================================
# 8. API VISUALISASI
# ============================================================

def compute_visualization(
    filter_req: Optional[VisualizationFilterRequest] = None
) -> VisualizationResponse:

    req = filter_req or VisualizationFilterRequest()

    ds = get_active_dataset()

    if not ds or not ds.get("rows"):
        return VisualizationResponse(
            has_active_dataset=False,
            warnings=["Belum ada dataset aktif."],
        )

    all_rows = ds["rows"]

    mapping = (
        req.column_mapping
        or ds["column_mapping"]
    )

    rows = _filtered_data(
        all_rows,
        mapping,
        req
    )

    def col(key):
        return eng.source(mapping, key)

    def unique(key):
        return sorted({
            eng.text_value(
                eng.value(r, mapping, key)
            )

            for r in all_rows

            if eng.present(
                eng.value(r, mapping, key)
            )
        })

    age_dist, age_valid, in_scope, out_scope = _age_counts(
        rows,
        mapping
    )

    gender_dist = _distribution([
        name

        for r in rows

        if (
            name := _gender_label(
                eng.value(
                    r,
                    mapping,
                    "jenis_kelamin"
                )
            )
        )
    ])

    status_dist = _status_distribution(
        rows,
        mapping
    )

    count_label = sum(
        eng.target_status(
            r,
            mapping
        )[0] is not None

        for r in rows
    )

    count_bbu = sum(
        eng.present(
            eng.value(
                r,
                mapping,
                "status_bb_u"
            )
        )

        for r in rows
    )

    count_bbtb = sum(
        eng.present(
            eng.value(
                r,
                mapping,
                "status_bb_tb"
            )
        )

        for r in rows
    )

    region_types = [
        key

        for key in (
            "kecamatan",
            "puskesmas",
            "desa_kelurahan"
        )

        if col(key)
    ]

    selected = req.region_type or "puskesmas"

    if selected not in region_types:
        if "puskesmas" in region_types:
            selected = "puskesmas"

        elif region_types:
            selected = region_types[0]

        else:
            selected = "none"

    if selected != "none":
        region_counts = _region_summary(
            rows,
            mapping,
            selected
        )
    else:
        region_counts = {}

    reg_dist = [
        RegionDistributionItem(
            region_name=k,
            count=v["total"],

            percentage=_percent(
                v["total"],

                sum(
                    q["total"]
                    for q in region_counts.values()
                ),
            ),

            stunting_count=v["stunting"],
            normal_count=v["normal"],
        )

        for k, v in sorted(
            region_counts.items(),
            key=lambda item: item[1]["total"],
            reverse=True
        )
    ]

    valid = sum(
        1

        for r in rows

        if _row_basic_valid(r, mapping)
    )

    age_options, _, _, _ = _age_counts(
        all_rows,
        mapping
    )

    filters = FilterOptions(
        kecamatan_list=unique("kecamatan"),
        puskesmas_list=unique("puskesmas"),
        desa_kelurahan_list=unique("desa_kelurahan"),
        jenis_kelamin_list=unique("jenis_kelamin"),

        age_group_list=[
            p.category

            for p in age_options

            if p.count > 0
        ],

        periode_list=unique("tanggal_ukur"),
    )

    warnings = []

    if not rows:
        warnings.append(
            "Tidak ada data yang sesuai dengan filter."
        )

    if out_scope:
        warnings.append(
            f"Terdapat {out_scope} data anak berusia "
            "≥ 60 bulan di luar cakupan balita."
        )

    has_target = bool(
        col("status_tb_u")
        or col("status_stunting")
        or col("zscore_tb_u")
    )

    return VisualizationResponse(
        has_active_dataset=True,
        filename=ds["filename"],

        total_unfiltered_rows=len(all_rows),
        total_filtered_rows=len(rows),

        summary=SummaryStats(
            total_records=len(rows),
            valid_records=valid,
            records_with_tbu=count_label,
            records_with_bbu=count_bbu,
            records_with_bbtb=count_bbtb,
            records_with_age=age_valid,
            in_scope_balita_count=in_scope,
            out_of_scope_age_count=out_scope,
            unique_regions_count=len(region_counts),
            region_label_used=selected,
        ),

        has_status_tbu_column=has_target,

        status_tbu_distribution=status_dist,

        status_tbu_unmapped_reason=(
            None
            if has_target
            else "Status TB/U belum dipetakan."
        ),

        has_status_bbu_column=bool(
            col("status_bb_u")
        ),

        status_bbu_distribution=_other_distribution(
            rows,
            col("status_bb_u")
        ),

        has_status_bbtb_column=bool(
            col("status_bb_tb")
        ),

        status_bbtb_distribution=_other_distribution(
            rows,
            col("status_bb_tb")
        ),

        has_age_column=bool(
            col("usia_saat_ukur")
        ),

        age_group_distribution=age_dist,

        has_gender_column=bool(
            col("jenis_kelamin")
        ),

        gender_distribution=gender_dist,

        available_region_types=region_types,
        selected_region_type=selected,

        region_distribution=reg_dist,

        region_unmapped_reason=(
            None
            if region_types
            else "Kolom wilayah belum dipetakan."
        ),

        zscore_tbu=_compute_zscore_stats(
            rows,
            col("zscore_tb_u"),
            "TB/U"
        ),

        zscore_bbu=_compute_zscore_stats(
            rows,
            col("zscore_bb_u"),
            "BB/U"
        ),

        zscore_bbtb=_compute_zscore_stats(
            rows,
            col("zscore_bb_tb"),
            "BB/TB"
        ),

        filter_options=filters,

        active_filters={
            "kecamatan": req.kecamatan,
            "puskesmas": req.puskesmas,
            "desa_kelurahan": req.desa_kelurahan,
            "jenis_kelamin": req.jenis_kelamin,
            "age_group": req.age_group,
            "periode": req.periode,
        },

        warnings=warnings,

        tableau_analytics=_compute_dashboard_tableau_analytics(
            all_rows,
            mapping,
            rows,
            req.desa_kelurahan,
        ),
    )


# ============================================================
# 9. FUNGSI MEMBUAT ITEM KATEGORI
# ============================================================

def _category_items(
    rows: list[dict[str, Any]],
    mapping: dict[str, str],
    categorize
) -> list[CategoryPrevalenceItem]:

    groups = defaultdict(
        lambda: {
            "total": 0,
            "stunting": 0,
        }
    )

    for row in rows:
        category = categorize(row)

        if category is None:
            continue

        group = groups[category]

        group["total"] += 1

        label, conflict = eng.target_status(
            row,
            mapping
        )

        if label is True and not conflict:
            group["stunting"] += 1

    denominator = sum(
        group["total"]
        for group in groups.values()
    )

    return [
        CategoryPrevalenceItem(
            category=key,
            total_count=group["total"],
            stunting_count=group["stunting"],

            normal_count=(
                group["total"]
                - group["stunting"]
            ),

            stunting_rate=_percent(
                group["stunting"],
                group["total"]
            ),

            percentage_of_total=_percent(
                group["total"],
                denominator
            ),
        )

        for key, group in groups.items()
    ]


# ============================================================
# 10. LIMA KELOMPOK ANALISIS DASHBOARD
# ============================================================

def _compute_dashboard_tableau_analytics(
    all_rows: list[dict[str, Any]],
    mapping: dict[str, str],
    section_rows: Optional[list[dict[str, Any]]] = None,
    desa_filter: Optional[str] = None,
) -> DashboardTableauAnalytics:

    rows = (
        section_rows
        if section_rows is not None
        else all_rows
    )

    def src(key):
        return eng.source(mapping, key)

    def val(row, key):
        return eng.value(row, mapping, key)

    # --------------------------------------------------------
    # BAGIAN 1: BERAT LAHIR DAN STUNTING
    # --------------------------------------------------------

    sec1 = DashboardSection1BirthWeight()

    if src("berat_lahir"):
        sec1.has_column = True

        pairs = [
            (
                row,
                eng.number(
                    val(row, "berat_lahir")
                )
            )

            for row in rows
        ]

        good_pairs = [
            (row, weight)

            for row, weight in pairs

            if (
                weight is not None
                and 0.5 <= weight <= 8
            )
        ]

        sec1.total_valid = len(good_pairs)

        if good_pairs:
            sec1.mean_birth_weight = round(
                mean(
                    weight
                    for _, weight in good_pairs
                ),
                2
            )

        sec1.categories = _category_items(
            [
                row
                for row, _ in good_pairs
            ],

            mapping,

            lambda row: (
                "BBLR (< 2,5 kg)"
                if eng.bblr(row, mapping)
                else "Normal (≥ 2,5 kg)"
            ),
        )

        by_cat = {
            p.category: p
            for p in sec1.categories
        }

        low = by_cat.get(
            "BBLR (< 2,5 kg)"
        )

        normal = by_cat.get(
            "Normal (≥ 2,5 kg)"
        )

        sec1.bblr_count = (
            low.total_count
            if low
            else 0
        )

        sec1.normal_count = (
            normal.total_count
            if normal
            else 0
        )

        sec1.bblr_stunting_count = (
            low.stunting_count
            if low
            else 0
        )

        sec1.bblr_stunting_rate = (
            low.stunting_rate
            if low
            else 0
        )

        sec1.normal_stunting_rate = (
            normal.stunting_rate
            if normal
            else 0
        )

        sec1.bblr_rate_overall = _percent(
            sec1.bblr_count,
            sec1.total_valid
        )

        sec1.boxplot_stunting = _compute_boxplot([
            w

            for row, w in good_pairs

            if eng.target_status(
                row,
                mapping
            )[0] is True
        ])

        sec1.boxplot_normal = _compute_boxplot([
            w

            for row, w in good_pairs

            if eng.target_status(
                row,
                mapping
            )[0] is False
        ])

        sec1.scatter_sample = [
            ScatterPoint(
                x=round(w, 2),
                y=round(z, 2),

                is_stunting=(
                    eng.target_status(
                        row,
                        mapping
                    )[0] is True
                ),

                label=(
                    eng.text_value(
                        val(row, "desa_kelurahan")
                        or val(row, "kecamatan")
                    )
                    or "Balita"
                ),
            )

            for row, w in good_pairs

            if (
                (
                    z := eng.number(
                        val(row, "zscore_tb_u")
                    )
                ) is not None
                and -8 <= z <= 8
            )
        ][:350]

    else:
        sec1.unmapped_reason = (
            "Kolom berat lahir belum dipetakan."
        )

    # --------------------------------------------------------
    # BAGIAN 2: KELOMPOK USIA BALITA
    # --------------------------------------------------------

    sec2 = DashboardSection2AgeCohort(
        has_column=bool(
            src("usia_saat_ukur")
        )
    )

    if sec2.has_column:
        highest = -1.0
        lowest_z = math.inf

        for low, high in eng.AGE_GROUPS:
            group = [
                r

                for r in rows

                if (
                    (
                        a := eng.number(
                            val(r, "usia_saat_ukur")
                        )
                    ) is not None

                    and low <= a <= high
                )
            ]

            label = f"{low}–{high} bln"

            stunted = sum(
                eng.target_status(
                    r,
                    mapping
                )[0] is True

                for r in group
            )

            rate = _percent(
                stunted,
                len(group)
            )

            zs = [
                z

                for r in group

                if (
                    (
                        z := eng.number(
                            val(r, "zscore_tb_u")
                        )
                    ) is not None

                    and -8 <= z <= 8
                )
            ]

            average_z = (
                round(mean(zs), 2)
                if zs
                else None
            )

            sec2.cohorts.append(
                AgeCohortItem(
                    cohort_label=label,
                    total_count=len(group),
                    stunting_count=stunted,
                    stunting_rate=rate,
                    mean_zscore_tbu=average_z,
                    boxplot=_compute_boxplot(zs),
                )
            )

            if group and rate > highest:
                highest = rate
                sec2.highest_stunting_cohort = label

            if (
                average_z is not None
                and average_z < lowest_z
            ):
                lowest_z = average_z
                sec2.lowest_mean_zscore_cohort = label

        sec2.highest_stunting_rate = (
            highest
            if highest >= 0
            else None
        )

    else:
        sec2.unmapped_reason = (
            "Kolom usia balita belum dipetakan."
        )

    # --------------------------------------------------------
    # BAGIAN 3: PERBANDINGAN DESA DAN KECAMATAN
    # --------------------------------------------------------

    sec3 = DashboardSection3RegionalSpread(
        has_column=bool(
            src("desa_kelurahan")
        )
    )

    if sec3.has_column:
        desa_groups = defaultdict(
            lambda: {
                "total": 0,
                "stunting": 0,
                "kecamatan": None,
            }
        )

        for r in rows:
            name = val(
                r,
                "desa_kelurahan"
            )

            if not eng.present(name):
                continue

            group = desa_groups[
                eng.text_value(name)
            ]

            group["total"] += 1

            group["kecamatan"] = (
                eng.text_value(
                    val(r, "kecamatan")
                )
                or None
            )

            if eng.target_status(
                r,
                mapping
            )[0] is True:
                group["stunting"] += 1

        sec3.total_desas_count = len(desa_groups)

        rates = [
            _percent(
                v["stunting"],
                v["total"]
            )

            for v in desa_groups.values()
        ]

        sec3.avg_desa_stunting_rate = (
            round(mean(rates), 1)
            if rates
            else 0
        )

        sec3.all_desas = [
            DesaSpreadItem(
                desa_name=name,
                kecamatan=v["kecamatan"],
                total_balita=v["total"],
                stunting_count=v["stunting"],

                stunting_rate=_percent(
                    v["stunting"],
                    v["total"]
                ),

                is_above_avg=(
                    _percent(
                        v["stunting"],
                        v["total"]
                    )
                    > sec3.avg_desa_stunting_rate
                ),
            )

            for name, v in desa_groups.items()
        ]

        sec3.all_desas.sort(
            key=lambda r: (
                r.stunting_rate,
                r.total_balita
            ),
            reverse=True
        )

        sec3.top_10_high_stunting_desas = (
            sec3.all_desas[:10]
        )

        sec3.desas_above_avg_count = sum(
            v.is_above_avg
            for v in sec3.all_desas
        )

    else:
        sec3.unmapped_reason = (
            "Kolom desa/kelurahan belum dipetakan."
        )

    # Perbandingan tingkat kecamatan
    if src("kecamatan"):
        kec_groups = defaultdict(
            lambda: {
                "total": 0,
                "stunting": 0,
                "desas": set(),
            }
        )

        for r in rows:
            name = val(
                r,
                "kecamatan"
            )

            if not eng.present(name):
                continue

            group = kec_groups[
                eng.text_value(name)
            ]

            group["total"] += 1

            if eng.target_status(
                r,
                mapping
            )[0] is True:
                group["stunting"] += 1

            if eng.present(
                val(r, "desa_kelurahan")
            ):
                group["desas"].add(
                    eng.text_value(
                        val(r, "desa_kelurahan")
                    )
                )

        sec3.kecamatan_spread = [
            KecamatanSpreadItem(
                kecamatan_name=name,
                total_balita=v["total"],
                stunting_count=v["stunting"],

                stunting_rate=_percent(
                    v["stunting"],
                    v["total"]
                ),

                desa_count=len(
                    v["desas"]
                ),
            )

            for name, v in kec_groups.items()
        ]

    # --------------------------------------------------------
    # BAGIAN 4: POSYANDU, KELAS IBU, DAN KORELASI
    # --------------------------------------------------------

    sec4 = DashboardSection4PosyanduParenting(
        has_naik_bb=bool(
            src("status_naik_berat_badan")
        ),

        has_kelas_ibu=bool(
            src("kelas_ibu_balita")
        ),
    )

    if sec4.has_naik_bb:
        labels = {
            "N": "N (Naik)",
            "T": "T (Tidak Naik)",
            "O": "O (Tidak Hadir)",
            "B": "B (Baru Pertama)",
            "NAIK": "N (Naik)",
            "TIDAK NAIK": "T (Tidak Naik)",
            "TIDAK HADIR": "O (Tidak Hadir)",
        }

        sec4.naik_bb_categories = _category_items(
            rows,
            mapping,

            lambda row: labels.get(
                eng.text_value(
                    val(
                        row,
                        "status_naik_berat_badan"
                    )
                ).upper()
            ),
        )

        n = next(
            (
                x
                for x in sec4.naik_bb_categories

                if x.category == "N (Naik)"
            ),
            None
        )

        sec4.naik_bb_overall_rate = (
            n.percentage_of_total
            if n
            else 0
        )

    else:
        sec4.naik_bb_unmapped_reason = (
            "Kolom kenaikan berat badan belum dipetakan."
        )

    if sec4.has_kelas_ibu:
        sec4.kelas_ibu_categories = _category_items(
            rows,
            mapping,

            lambda row: (
                "Mengikuti (Ya)"

                if eng.text_value(
                    val(row, "kelas_ibu_balita")
                ).lower() in {
                    "ya",
                    "y",
                    "ikut",
                    "mengikuti",
                    "true",
                    "1",
                }

                else (
                    "Tidak Mengikuti (Tidak)"

                    if eng.text_value(
                        val(row, "kelas_ibu_balita")
                    ).lower() in {
                        "tidak",
                        "t",
                        "tdk",
                        "tidak ikut",
                        "false",
                        "0",
                    }

                    else None
                )
            ),
        )

        yes = next(
            (
                x
                for x in sec4.kelas_ibu_categories

                if x.category == "Mengikuti (Ya)"
            ),
            None
        )

        sec4.kelas_ibu_participation_rate = (
            yes.percentage_of_total
            if yes
            else 0
        )

    else:
        sec4.kelas_ibu_unmapped_reason = (
            "Kolom kelas ibu belum dipetakan."
        )

    # Korelasi Pearson untuk empat variabel numerik
    matrix = [
        ("Berat Lahir (kg)", "berat_lahir"),
        ("Panjang Lahir (cm)", "panjang_lahir"),
        ("Usia Balita (bln)", "usia_saat_ukur"),
        ("Z-Score TB/U", "zscore_tb_u"),
    ]

    sec4.correlation_variables = [
        name
        for name, _ in matrix
    ]

    for name_a, key_a in matrix:
        for name_b, key_b in matrix:

            pairs = [
                (a, b)

                for r in rows

                if (
                    (
                        a := eng.number(
                            val(r, key_a)
                        )
                    ) is not None

                    and (
                        b := eng.number(
                            val(r, key_b)
                        )
                    ) is not None
                )
            ]

            if key_a == key_b and src(key_a):
                corr = 1.0

            elif src(key_a) and src(key_b):
                corr = _compute_pearson_r(
                    [p[0] for p in pairs],
                    [p[1] for p in pairs],
                )

            else:
                corr = None

            sec4.correlation_cells.append(
                HeatmapCell(
                    row_var=name_a,
                    col_var=name_b,
                    correlation=corr,
                    sample_size=len(pairs),
                )
            )

    # --------------------------------------------------------
    # BAGIAN 5: GIZI IBU DAN KONDISI KELAHIRAN
    # --------------------------------------------------------

    sec5 = DashboardSection5MaternalFactors(
        has_lila=bool(
            src("status_gizi_ibu")
            or src("lila_ibu")
        ),

        has_panjang_lahir=bool(
            src("panjang_lahir")
        ),
    )

    if sec5.has_lila:
        sec5.lila_categories = _category_items(
            rows,
            mapping,

            lambda row: (
                "KEK/Risiko KEK"

                if eng.kek(
                    row,
                    mapping
                ) is True

                else (
                    "Normal"

                    if eng.kek(
                        row,
                        mapping
                    ) is False

                    else None
                )
            ),
        )

        risk = next(
            (
                x
                for x in sec5.lila_categories

                if x.category == "KEK/Risiko KEK"
            ),
            None
        )

        sec5.kek_risk_rate = (
            risk.percentage_of_total
            if risk
            else 0
        )

    else:
        sec5.lila_unmapped_reason = (
            "Status gizi ibu atau LiLA ibu belum dipetakan."
        )

    sec5.bblr_rate_overall = sec1.bblr_rate_overall

    sec5.bblr_categories = sec1.categories

    if sec5.has_panjang_lahir:
        sec5.scatter_panjang_sample = [
            ScatterPoint(
                x=round(p, 1),
                y=round(z, 2),

                is_stunting=(
                    eng.target_status(
                        r,
                        mapping
                    )[0] is True
                ),

                label=(
                    eng.text_value(
                        val(r, "kecamatan")
                    )
                    or "Balita"
                ),
            )

            for r in rows

            if (
                (
                    p := eng.number(
                        val(r, "panjang_lahir")
                    )
                ) is not None

                and 25 <= p <= 65

                and (
                    z := eng.number(
                        val(r, "zscore_tb_u")
                    )
                ) is not None

                and -8 <= z <= 8
            )
        ][:350]

    else:
        sec5.panjang_lahir_unmapped_reason = (
            "Panjang lahir belum dipetakan."
        )

    # --------------------------------------------------------
    # TREN PENGUKURAN DATASET AKTIF
    # --------------------------------------------------------

    time = DashboardTimeSeriesTrend(
        has_date_column=bool(
            src("tanggal_ukur")
        )
    )

    if time.has_date_column:
        for entry in eng.monthly(
            rows,
            mapping
        ):
            time.points.append(
                AnnotatedTimeSeriesPoint(
                    period_label=entry["periode"],
                    total_measured=entry["total"],
                    stunting_count=entry["stunting"],

                    stunting_rate=(
                        entry["proporsi_stunting"]
                        or 0
                    ),
                )
            )

    else:
        time.unmapped_reason = (
            "Tanggal pengukuran tidak tersedia."
        )

    return DashboardTableauAnalytics(
        selected_desa_filter=desa_filter,
        section1_birth_weight=sec1,
        section2_age_cohort=sec2,
        section3_regional_spread=sec3,
        section4_posyandu_parenting=sec4,
        section5_maternal_factors=sec5,
        time_series_trend=time,
    )


# ============================================================
# 11. RINGKASAN DASHBOARD UTAMA
# ============================================================

def compute_dashboard_summary(
    desa_filter: Optional[str] = None,
    *,
    kecamatan: Optional[str] = None,
    puskesmas: Optional[str] = None,
    jenis_kelamin: Optional[str] = None,
    age_group: Optional[str] = None,
    status_stunting: Optional[str] = None,
    periode: Optional[str] = None,
) -> DashboardSummaryResponse:

    ds = get_active_dataset()

    if not ds or not ds.get("rows"):
        return DashboardSummaryResponse(
            has_active_dataset=False,

            warnings=[
                "Belum ada dataset balita aktif. "
                "Silakan unggah CSV/Excel."
            ],
        )

    mapping = ds["column_mapping"]

    filters = {
        "desa_kelurahan": desa_filter,
        "kecamatan": kecamatan,
        "puskesmas": puskesmas,
        "jenis_kelamin": jenis_kelamin,
        "age_group": age_group,
        "status_stunting": status_stunting,
        "periode": periode,
    }

    all_rows = ds["rows"]

    rows = eng.filtered_rows(
        all_rows,
        mapping,
        filters
    )

    def src(key):
        return eng.source(mapping, key)

    def val(row, key):
        return eng.value(row, mapping, key)

    # Pemeriksaan dasar kualitas antropometri
    valid_rows = [
        r

        for r in rows

        if (
            src("usia_saat_ukur")
            and src("berat_badan")
            and src("tinggi_badan")

            and _row_basic_valid(
                r,
                mapping
            )

            and (
                w := eng.number(
                    val(r, "berat_badan")
                )
            ) is not None

            and 1 <= w <= 40
        )
    ]

    valid = len(valid_rows)

    age_dist, age_count, in_scope, out_scope = _age_counts(
        rows,
        mapping
    )

    if src("kecamatan"):
        region_key = "kecamatan"

    elif src("puskesmas"):
        region_key = "puskesmas"

    else:
        region_key = "desa_kelurahan"

    region_groups = _region_summary(
        rows,
        mapping,
        region_key
    )

    reg_summary = [
        DashboardRegionSummaryItem(
            nama=k,
            count=v["total"],

            percentage=_percent(
                v["total"],
                len(rows)
            ),

            stunting_count=(
                v["stunting"]

                if (
                    src("status_tb_u")
                    or src("status_stunting")
                    or src("zscore_tb_u")
                )

                else None
            ),
        )

        for k, v in sorted(
            region_groups.items(),
            key=lambda item: item[1]["total"],
            reverse=True
        )[:8]
    ]

    # Empat KPI dari mesin analitik yang sama
    kpi = eng.kpis(
        rows,
        mapping
    )

    total_stunted = kpi["stunting"]["pembilang"]

    has_target = bool(
        src("status_tb_u")
        or src("status_stunting")
        or src("zscore_tb_u")
    )

    factor_items = [
        DashboardRiskFactorItem(
            faktor=label,
            jumlah=kpi[key]["pembilang"],

            persentase=round(
                kpi[key]["persentase"],
                1
            ),
        )

        for key, label in (
            ("bblr", "BBLR"),
            ("kek_ibu", "KEK/Risiko KEK"),
            (
                "posyandu_lengkap",
                "Kunjungan Posyandu lengkap"
            ),
        )

        if kpi[key]["persentase"] is not None
    ]

    # Kolom antropometri
    age_col = src("usia_saat_ukur")
    height_col = src("tinggi_badan")
    weight_col = src("berat_badan")

    out_range = len(rows) - valid

    # Hasil pemeriksaan kualitas dari upload
    preview = ds.get("preview_response")

    missing = (
        sum(
            c.null_count
            for c in preview.columns
        )
        if preview
        else 0
    )

    duplicates = (
        preview.identical_duplicates_count
        if preview
        else 0
    )

    repeat = (
        preview.potential_repeat_measurements_count
        if preview
        else 0
    )

    issues = (
        len(preview.quality_issues)
        if preview
        else 0
    )

    highlights = []

    if duplicates:
        highlights.append(
            f"{duplicates} baris duplikat terdeteksi."
        )

    if out_scope:
        highlights.append(
            f"{out_scope} anak berusia ≥ 60 bulan "
            "di luar cakupan."
        )

    if out_range:
        highlights.append(
            f"{out_range} catatan tidak memenuhi "
            "pemeriksaan dasar."
        )

    if missing:
        highlights.append(
            f"{missing} nilai kosong ditemukan."
        )

    if not highlights:
        highlights.append(
            "Seluruh catatan memenuhi pemeriksaan dasar."
        )

    required = (
        "usia_saat_ukur",
        "jenis_kelamin",
        "berat_badan",
        "tinggi_badan",
        "status_tb_u",
    )

    unmapped = [
        key

        for key in required

        if not src(key)
    ]

    # Pratinjau maksimal enam baris tanpa identitas pribadi
    preview_rows = []

    for i, row in enumerate(
        rows[:6],
        start=1
    ):
        a = eng.number(
            val(row, "usia_saat_ukur")
        )

        w = eng.number(
            val(row, "berat_badan")
        )

        h = eng.number(
            val(row, "tinggi_badan")
        )

        status, conflict = eng.target_status(
            row,
            mapping
        )

        preview_rows.append({
            "id": str(i),
            "kodeAnak": f"BLT-{i:03d}",

            "usia": (
                int(a)
                if a is not None
                else 0
            ),

            "jenisKelamin": (
                eng.normalize_gender(
                    val(row, "jenis_kelamin")
                )
                or "-"
            ),

            "beratBadan": (
                round(w, 1)
                if w is not None
                else 0.0
            ),

            "tinggiBadan": (
                round(h, 1)
                if h is not None
                else 0.0
            ),

            "wilayah": (
                eng.text_value(
                    val(row, region_key)
                )
                or "-"
            ),

            "statusData": (
                "Valid"
                if row in valid_rows
                else "Perlu Diperiksa"
            ),

            "statusStunting": (
                "Stunting"
                if status is True and not conflict

                else (
                    "Tidak Stunting"
                    if status is False and not conflict
                    else "-"
                )
            ),
        })

    # Tren dari tanggal pengukuran dataset
    dates = eng.monthly(
        rows,
        mapping
    )

    months = [
        DashboardMonthlyTrendItem(
            bulan=x["periode"],
            tercatat=x["total"],
            valid=x["berlabel"],
        )

        for x in dates
    ]

    warnings = []

    if out_scope:
        warnings.append(
            f"Terdapat {out_scope} data anak berusia "
            "≥ 60 bulan di luar cakupan balita."
        )

    if not has_target:
        warnings.append(
            "Status stunting belum tersedia "
            "karena label tidak dipetakan."
        )

    if not src("tanggal_ukur"):
        warnings.append(
            "Tanggal pengukuran belum dipetakan."
        )

    # Hasil lengkap dashboard
    return DashboardSummaryResponse(
        has_active_dataset=True,
        filename=ds["filename"],
        updated_at=ds["updated_at"],

        total_records=len(rows),
        valid_records=valid,

        need_check_records=(
            len(rows) - valid
        ),

        valid_percentage=_percent(
            valid,
            len(rows)
        ),

        need_check_percentage=_percent(
            len(rows) - valid,
            len(rows)
        ),

        has_region=bool(region_groups),

        total_kecamatan=len({
            eng.text_value(
                val(r, "kecamatan")
            )

            for r in rows

            if eng.present(
                val(r, "kecamatan")
            )
        }),

        total_puskesmas=len({
            eng.text_value(
                val(r, "puskesmas")
            )

            for r in rows

            if eng.present(
                val(r, "puskesmas")
            )
        }),

        total_desa=len({
            eng.text_value(
                val(r, "desa_kelurahan")
            )

            for r in rows

            if eng.present(
                val(r, "desa_kelurahan")
            )
        }),

        region_label_used=(
            region_key
            if region_groups
            else "wilayah"
        ),

        region_summary=reg_summary,

        has_status_tbu=has_target,

        status_tbu_unmapped_reason=(
            None
            if has_target
            else "Status stunting belum dipetakan."
        ),

        stunted_count=total_stunted,

        stunted_percentage=round(
            kpi["stunting"]["persentase"] or 0,
            1
        ),

        tbu_distribution=(
            _status_distribution(
                rows,
                mapping
            )
            if has_target
            else []
        ),

        has_status_bbu=bool(
            src("status_bb_u")
        ),

        bbu_distribution=_other_distribution(
            rows,
            src("status_bb_u")
        ),

        has_status_bbtb=bool(
            src("status_bb_tb")
        ),

        bbtb_distribution=_other_distribution(
            rows,
            src("status_bb_tb")
        ),

        has_age=bool(age_col),
        in_scope_balita_count=in_scope,
        out_of_scope_age_count=out_scope,
        age_distribution=age_dist,

        has_gender=bool(
            src("jenis_kelamin")
        ),

        gender_distribution=_distribution([
            g

            for r in rows

            if (
                g := _gender_label(
                    val(r, "jenis_kelamin")
                )
            )
        ]),

        has_date_trend=bool(months),

        date_trend_unmapped_reason=(
            None
            if months
            else (
                "Tanggal pengukuran belum dipetakan "
                "atau periode tidak valid."
            )
        ),

        monthly_trend=months,

        has_risk_factors=bool(factor_items),

        risk_factors_unmapped_reason=(
            None
            if factor_items
            else "Variabel faktor risiko belum dipetakan."
        ),

        risk_factors=factor_items,

        kpi=kpi,

        total_quality_issues=issues,
        missing_values_count=missing,
        duplicates_count=duplicates,
        repeat_measurements_count=repeat,
        out_of_range_count=out_range,
        unmapped_required_columns=unmapped,
        quality_highlights=highlights,
        preview_rows=preview_rows,

        preview_headers=[
            "kodeAnak",
            "usia",
            "jenisKelamin",
            "beratBadan",
            "tinggiBadan",
            "wilayah",
            "statusData",
        ],

        readiness_status=(
            preview.readiness_status
            if preview
            else "siap_analisis"
        ),

        readiness_message=(
            preview.readiness_message
            if preview
            else None
        ),

        warnings=warnings,

        tableau_analytics=_compute_dashboard_tableau_analytics(
            all_rows,
            mapping,
            rows,
            desa_filter,
        ),
    )