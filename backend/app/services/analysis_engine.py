from __future__ import annotations

from collections import defaultdict
from typing import Any, Optional
import math
import re


UNKNOWN = {
    "", "-", "nan", "none", "null", "nil",
    "tidak diketahui", "unknown", "n/a", "na",
    "belum dapat dinilai", "belum dinilai", "tidak ada data",
}

STUNT = {
    "1", "stunting", "pendek", "sangat pendek", "true", "ya"
}

NORMAL = {
    "0", "tidak stunting", "non-stunting", "non stunting",
    "normal", "tinggi", "false", "tidak"
}

AGE_GROUPS = [
    (0, 5),
    (6, 11),
    (12, 23),
    (24, 35),
    (36, 47),
    (48, 59),
]

RISK_COLUMNS = {
    "bblr": "Berat lahir rendah (BBLR)",
    "status_gizi_ibu": "Status gizi ibu",
    "asi_eksklusif": "ASI eksklusif",
    "kunjungan_posyandu_3bln": "Kunjungan Posyandu 3 bulan",
    "sanitasi_layak": "Sanitasi layak",
    "riwayat_diare_3bln": "Riwayat diare 3 bulan",
    "akses_air_bersih": "Akses air bersih",
    "pendidikan_ibu": "Pendidikan ibu",
    "usia_ibu_tahun": "Usia ibu",
}


def text_value(v: Any) -> str:
    return "" if v is None else str(v).strip()


def present(v: Any) -> bool:
    return text_value(v).casefold() not in UNKNOWN


def number(v: Any) -> Optional[float]:
    if not present(v):
        return None

    try:
        number_value = float(
            text_value(v).replace(",", ".")
        )

        return (
            number_value
            if math.isfinite(number_value)
            else None
        )

    except (TypeError, ValueError):
        return None


def source(
    mapping: dict[str, str],
    key: str
) -> Optional[str]:
    return next(
        (
            column
            for column, target in mapping.items()
            if target == key
        ),
        None
    )


def value(
    row: dict[str, Any],
    mapping: dict[str, str],
    key: str
) -> Any:
    col = source(mapping, key)

    return row.get(col) if col is not None else None


def _binary_status(v: Any) -> Optional[bool]:
    raw = text_value(v).casefold().replace("_", " ")

    if raw in STUNT:
        return True

    if raw in NORMAL:
        return False

    return None


def _category_tbu(v: Any) -> Optional[bool]:
    raw = text_value(v).casefold().replace("_", " ")

    if not present(raw):
        return None

    if raw in {"pendek", "sangat pendek", "stunting"}:
        return True

    if raw in {
        "normal", "tinggi", "tidak stunting", "non-stunting"
    }:
        return False

    return None


def target_status(
    row: dict[str, Any],
    mapping: dict[str, str]
) -> tuple[Optional[bool], bool]:
    """
    Mengembalikan (label, konflik).

    Label yang mengalami konflik tidak dihitung sebagai normal.
    """

    candidates: list[bool] = []

    label_column = source(
        mapping,
        "status_stunting"
    )

    if label_column:
        parsed = _binary_status(
            row.get(label_column)
        )

        if parsed is not None:
            candidates.append(parsed)

    tbu_column = source(
        mapping,
        "status_tb_u"
    )

    if tbu_column:
        parsed = _category_tbu(
            row.get(tbu_column)
        )

        if parsed is not None:
            candidates.append(parsed)

    z_column = source(
        mapping,
        "zscore_tb_u"
    )

    if z_column:
        z = number(row.get(z_column))

        if z is not None:
            candidates.append(z < -2.0)

    if not candidates:
        return None, False

    if len(set(candidates)) > 1:
        return None, True

    return candidates[0], False


def _age(
    row: dict[str, Any],
    mapping: dict[str, str]
) -> Optional[float]:
    return number(
        value(row, mapping, "usia_saat_ukur")
    )


def group_age(
    age: Optional[float]
) -> Optional[str]:
    if age is None:
        return None

    for low, high in AGE_GROUPS:
        if low <= age <= high:
            return f"{low}-{high}"

    return None


def normalize_gender(v: Any) -> Optional[str]:
    raw = text_value(v).casefold()

    if raw in {
        "l", "laki-laki", "laki", "male", "m"
    }:
        return "L"

    if raw in {
        "p", "perempuan", "wanita", "female", "f"
    }:
        return "P"

    return raw.upper() if present(raw) else None


def _matching(
    row: dict[str, Any],
    mapping: dict[str, str],
    filters: Optional[dict]
) -> bool:
    active = filters or {}

    # Filter wilayah
    for key in (
        "kecamatan",
        "puskesmas",
        "desa_kelurahan"
    ):
        selected = active.get(key)

        if selected and (
            text_value(
                value(row, mapping, key)
            ).casefold()
            != text_value(selected).casefold()
        ):
            return False

    # Filter jenis kelamin
    gender = active.get("jenis_kelamin")

    if gender and (
        normalize_gender(
            value(row, mapping, "jenis_kelamin")
        )
        != normalize_gender(gender)
    ):
        return False

    # Filter kelompok usia
    age_filter = active.get("age_group")

    if age_filter:
        age = _age(row, mapping)

        target = (
            text_value(age_filter)
            .lower()
            .replace("–", "-")
            .replace("bln", "")
            .replace("bulan", "")
            .strip()
        )

        if target.startswith("60") or "luar" in target:
            if age is None or age < 60:
                return False

        elif group_age(age) != target:
            return False

    # Filter status stunting
    selected_status = active.get("status_stunting")

    if selected_status is not None and selected_status != "":
        desired = _binary_status(selected_status)

        label, conflict = target_status(row, mapping)

        if desired is None or conflict or label != desired:
            return False

    # Filter tanggal atau periode
    period = active.get("periode")

    if period:
        date_column = source(
            mapping,
            "tanggal_ukur"
        )

        if not date_column:
            return False

        date = text_value(
            row.get(date_column)
        )

        if date != period and not date.startswith(
            f"{period}-"
        ):
            return False

    return True


def filtered_rows(
    rows,
    mapping,
    filters=None
):
    return [
        row
        for row in rows
        if _matching(row, mapping, filters)
    ]


def _rate(
    numerator: int,
    denominator: int
) -> Optional[float]:
    return (
        round(numerator * 100 / denominator, 2)
        if denominator
        else None
    )


def _kpi(
    name,
    numerator,
    denominator,
    eligible,
    description
):
    return {
        "nama": name,
        "pembilang": numerator,
        "penyebut": denominator,
        "persentase": _rate(numerator, denominator),
        "jumlah_data_tidak_terpakai": eligible - denominator,
        "keterangan": description,
    }


def bblr(row, mapping) -> Optional[bool]:
    weight = number(
        value(row, mapping, "berat_lahir")
    )

    if weight is not None and 0.3 <= weight <= 8:
        return weight < 2.5

    return _binary_status(
        value(row, mapping, "indikator_bblr")
    )


def kek(row, mapping) -> Optional[bool]:
    category = text_value(
        value(row, mapping, "status_gizi_ibu")
    ).casefold()

    if category in {
        "normal", "baik", "tidak kek"
    }:
        return False

    if "kek" in category:
        return True

    # Hanya LiLA ibu, bukan LiLA balita
    lila = number(
        value(row, mapping, "lila_ibu")
    )

    if lila is not None and 10 <= lila <= 50:
        return lila < 23.5

    return None


def posyandu_complete(
    row,
    mapping
) -> Optional[bool]:
    visits = number(
        value(
            row,
            mapping,
            "kunjungan_posyandu_3bln"
        )
    )

    return visits == 3 if visits in {0, 1, 2, 3} else None


def kpis(rows, mapping):
    labels = [
        target_status(row, mapping)[0]
        for row in rows
    ]

    valid_labels = [
        label
        for label in labels
        if label is not None
    ]

    result = {
        "stunting": _kpi(
            "Proporsi stunting",
            sum(
                label is True
                for label in valid_labels
            ),
            len(valid_labels),
            len(rows),
            "Penyebut: label valid tanpa konflik.",
        )
    }

    for key, title, evaluator in (
        ("bblr", "Persentase BBLR", bblr),

        (
            "posyandu_lengkap",
            "Kunjungan Posyandu lengkap",
            posyandu_complete,
        ),

        (
            "kek_ibu",
            "Ibu KEK/Risiko KEK",
            kek,
        ),
    ):
        values = [
            evaluator(row, mapping)
            for row in rows
        ]

        known = [
            item
            for item in values
            if item is not None
        ]

        result[key] = _kpi(
            title,
            sum(known),
            len(known),
            len(rows),
            "Penyebut: catatan dengan faktor yang diketahui.",
        )

    return result


def category_for_factor(
    row,
    mapping,
    factor
):
    if factor == "bblr":
        flag = bblr(row, mapping)

        if flag is True:
            return "BBLR"

        if flag is False:
            return "Bukan BBLR"

        return None

    if factor == "status_gizi_ibu":
        raw = text_value(
            value(row, mapping, factor)
        )

        if not present(raw):
            return None

        if "kek" in raw.casefold():
            return "KEK/Risiko KEK"

        return (
            "Normal"
            if raw.casefold() == "normal"
            else raw
        )

    if factor == "kunjungan_posyandu_3bln":
        visits = number(
            value(row, mapping, factor)
        )

        if visits in {0, 1, 2, 3}:
            return f"{int(visits)} kunjungan"

        return None

    if factor == "usia_ibu_tahun":
        age = number(
            value(row, mapping, factor)
        )

        if age is None:
            return None

        if age < 20:
            return "<20 tahun"

        if age < 35:
            return "20-34 tahun"

        return "35+ tahun"

    raw = value(row, mapping, factor)

    return text_value(raw) if present(raw) else None


def distribution_by(
    rows,
    mapping,
    factor,
    allow_unknown=False
):
    groups = defaultdict(
        lambda: {
            "total": 0,
            "berlabel": 0,
            "stunting": 0,
            "tidak_stunting": 0,
            "konflik": 0,
        }
    )

    for row in rows:
        category = category_for_factor(
            row,
            mapping,
            factor
        )

        if category is None and not allow_unknown:
            continue

        group = groups[
            category or "Tidak diketahui"
        ]

        group["total"] += 1

        label, conflict = target_status(
            row,
            mapping
        )

        if conflict:
            group["konflik"] += 1

        elif label is not None:
            group["berlabel"] += 1

            if label:
                group["stunting"] += 1
            else:
                group["tidak_stunting"] += 1

    return [
        {
            "kategori": category,
            **info,
            "proporsi_stunting": _rate(
                info["stunting"],
                info["berlabel"]
            )
        }

        for category, info in sorted(groups.items())
    ]


def group_distribution(
    rows,
    mapping,
    key
):
    groups = defaultdict(
        lambda: {
            "jumlah": 0,
            "berlabel": 0,
            "stunting": 0,
        }
    )

    for row in rows:

        if key == "kelompok_usia":
            category = group_age(
                _age(row, mapping)
            )

        elif key == "jenis_kelamin":
            category = normalize_gender(
                value(row, mapping, key)
            )

        else:
            raw = value(
                row,
                mapping,
                key
            )

            category = (
                text_value(raw)
                if present(raw)
                else None
            )

        if category is None:
            continue

        group = groups[category]
        group["jumlah"] += 1

        label, conflict = target_status(
            row,
            mapping
        )

        if label is not None and not conflict:
            group["berlabel"] += 1

            if label:
                group["stunting"] += 1

    return [
        {
            "kategori": category,
            **info,
            "proporsi_stunting": _rate(
                info["stunting"],
                info["berlabel"]
            )
        }

        for category, info in sorted(groups.items())
    ]


def _matrix(
    rows,
    mapping,
    row_key,
    column_key
):
    nested = defaultdict(
        lambda: defaultdict(
            lambda: {
                "jumlah": 0,
                "berlabel": 0,
                "stunting": 0,
            }
        )
    )

    for row in rows:

        def get_category(key):
            if key == "kelompok_usia":
                return group_age(
                    _age(row, mapping)
                )

            if key == "jenis_kelamin":
                return normalize_gender(
                    value(row, mapping, key)
                )

            raw = value(
                row,
                mapping,
                key
            )

            return (
                text_value(raw)
                if present(raw)
                else None
            )

        first = get_category(row_key)
        second = get_category(column_key)

        if not first or not second:
            continue

        bucket = nested[first][second]
        bucket["jumlah"] += 1

        label, conflict = target_status(
            row,
            mapping
        )

        if label is not None and not conflict:
            bucket["berlabel"] += 1

            if label:
                bucket["stunting"] += 1

    return [
        {
            row_key: first,
            column_key: second,
            **info,
            "proporsi_stunting": _rate(
                info["stunting"],
                info["berlabel"]
            )
        }

        for first, values in sorted(nested.items())
        for second, info in sorted(values.items())
    ]


def numeric_boxplot(
    rows,
    mapping,
    key,
    group_by="status_stunting"
):
    groups = defaultdict(list)

    for row in rows:
        val = number(
            value(row, mapping, key)
        )

        if val is None:
            continue

        if group_by == "status_stunting":
            label, conflict = target_status(
                row,
                mapping
            )

            if conflict or label is None:
                continue

            category = (
                "Stunting"
                if label
                else "Tidak Stunting"
            )

        elif group_by == "kelompok_usia":
            category = group_age(
                _age(row, mapping)
            )

        else:
            category = text_value(
                value(row, mapping, group_by)
            )

        if category:
            groups[category].append(val)

    def percentile(values, p):
        values = sorted(values)

        position = (len(values) - 1) * p

        low = math.floor(position)
        high = math.ceil(position)

        return (
            values[low]
            + (values[high] - values[low])
            * (position - low)
        )

    return [
        {
            "kategori": category,
            "jumlah": len(values),
            "min": min(values),

            "q1": round(
                percentile(values, 0.25),
                3
            ),

            "median": round(
                percentile(values, 0.5),
                3
            ),

            "q3": round(
                percentile(values, 0.75),
                3
            ),

            "max": max(values),

            "mean": round(
                sum(values) / len(values),
                3
            ),
        }

        for category, values in sorted(groups.items())
    ]


def monthly(rows, mapping):
    col = source(
        mapping,
        "tanggal_ukur"
    )

    if not col:
        return []

    grouped = defaultdict(
        lambda: {
            "total": 0,
            "berlabel": 0,
            "stunting": 0,
        }
    )

    for row in rows:
        match = re.match(
            r"^(\d{4})[-/](\d{1,2})",
            text_value(row.get(col))
        )

        if not match:
            continue

        year = int(match.group(1))
        month = int(match.group(2))

        if not 1 <= month <= 12:
            continue

        month_key = f"{year:04d}-{month:02d}"

        grouped[month_key]["total"] += 1

        label, conflict = target_status(
            row,
            mapping
        )

        if label is not None and not conflict:
            grouped[month_key]["berlabel"] += 1

            if label:
                grouped[month_key]["stunting"] += 1

    return [
        {
            "periode": period,
            **info,
            "proporsi_stunting": _rate(
                info["stunting"],
                info["berlabel"]
            )
        }

        for period, info in sorted(grouped.items())
    ]


def check_data(rows, mapping):
    conflicts = 0
    unknown_labels = 0
    valid_labels: set[bool] = set()
    age_invalid = 0

    for row in rows:
        label, conflict = target_status(
            row,
            mapping
        )

        if conflict:
            conflicts += 1

        if label is None:
            unknown_labels += 1
        else:
            valid_labels.add(label)

        age = _age(row, mapping)

        if age is None or not (0 <= age < 60):
            age_invalid += 1

    has_label = bool(
        source(mapping, "status_stunting")
        or source(mapping, "status_tb_u")
        or source(mapping, "zscore_tb_u")
    )

    return {
        "total_baris": len(rows),
        "label_konflik": conflicts,
        "label_tidak_diketahui_termasuk_konflik": unknown_labels,
        "usia_di_luar_0_59_atau_kosong": age_invalid,
        "kesiapan_dashboard": has_label,

        "kesiapan_ml_awal": (
            len(rows) >= 500
            and len(valid_labels) == 2
            and conflicts == 0
        ),

        "peringatan": (
            "Kesiapan awal ML tidak membuktikan "
            "validitas data sumber."
        ),
    }


def analysis_payload(
    rows,
    mapping,
    filters=None
):
    active = filtered_rows(
        rows,
        mapping,
        filters
    )

    factors = {
        key: distribution_by(
            active,
            mapping,
            key
        )

        for key in RISK_COLUMNS
        if key == "bblr" or source(mapping, key)
    }

    return {
        "total_tanpa_filter": len(rows),
        "total_setelah_filter": len(active),
        "filter_aktif": filters or {},

        "kpi": kpis(active, mapping),

        "kualitas_label": check_data(
            active,
            mapping
        ),

        "perbandingan_wilayah": group_distribution(
            active,
            mapping,
            "kecamatan"
        ),

        "distribusi_usia": group_distribution(
            active,
            mapping,
            "kelompok_usia"
        ),

        "distribusi_jenis_kelamin": group_distribution(
            active,
            mapping,
            "jenis_kelamin"
        ),

        "faktor_risiko": factors,

        "visualisasi": {
            "heatmap_kecamatan_usia": _matrix(
                active,
                mapping,
                "kecamatan",
                "kelompok_usia"
            ),

            "small_multiples_kecamatan_gender": _matrix(
                active,
                mapping,
                "kecamatan",
                "jenis_kelamin"
            ),

            "boxplot_berat_lahir": numeric_boxplot(
                active,
                mapping,
                "berat_lahir"
            ),

            "boxplot_berat_usia": numeric_boxplot(
                active,
                mapping,
                "berat_badan",
                "kelompok_usia"
            ),

            "tren_bulanan_dataset": monthly(
                active,
                mapping
            ),
        },

        "catatan": (
            "Proporsi dataset, bukan prevalensi populasi. "
            "Korelasi bukan kausalitas."
        ),
    }


def chart_payload(
    rows,
    mapping,
    filters=None
):
    active = filtered_rows(
        rows,
        mapping,
        filters
    )

    content = analysis_payload(
        rows,
        mapping,
        filters
    )

    factors = content["faktor_risiko"]

    weights = defaultdict(list)

    for row in active:
        weight = number(
            value(row, mapping, "berat_lahir")
        )

        label, conflict = target_status(
            row,
            mapping
        )

        if (
            weight is not None
            and label is not None
            and not conflict
        ):
            category = (
                "Stunting"
                if label
                else "Tidak Stunting"
            )

            weights[category].append(weight)

    kpi = content["kpi"]["stunting"]

    specs = [
        (
            "01_status",
            "bar",
            "Distribusi status stunting",
            [
                {
                    "kategori": "Stunting",
                    "jumlah": kpi["pembilang"],
                },
                {
                    "kategori": "Tidak Stunting",
                    "jumlah": (
                        kpi["penyebut"]
                        - kpi["pembilang"]
                    ),
                },
            ],
        ),

        (
            "02_heatmap_wilayah_usia",
            "heatmap",
            "Proporsi stunting per kecamatan dan usia",
            content["visualisasi"]["heatmap_kecamatan_usia"],
        ),

        (
            "03_treemap_wilayah",
            "treemap",
            "Komposisi catatan per kecamatan",
            content["perbandingan_wilayah"],
        ),

        (
            "04_violin_berat_lahir",
            "violin",
            "Distribusi berat lahir",
            [
                {
                    "kategori": k,
                    "nilai": v
                }

                for k, v in weights.items()
            ],
        ),

        (
            "05_box_berat_usia",
            "box",
            "Berat menurut kelompok usia",
            content["visualisasi"]["boxplot_berat_usia"],
        ),

        (
            "06_small_multiples_gender",
            "small_multiples",
            "Kecamatan dan jenis kelamin",
            content["visualisasi"]["small_multiples_kecamatan_gender"],
        ),

        (
            "07_bblr",
            "grouped_bar",
            "Proporsi stunting BBLR",
            factors.get("bblr", []),
        ),

        (
            "08_asi",
            "grouped_bar",
            "ASI eksklusif",
            factors.get("asi_eksklusif", []),
        ),

        (
            "09_gizi_ibu",
            "bar",
            "Status gizi ibu",
            factors.get("status_gizi_ibu", []),
        ),

        (
            "10_posyandu",
            "bar",
            "Kunjungan Posyandu",
            factors.get("kunjungan_posyandu_3bln", []),
        ),

        (
            "11_sanitasi_diare",
            "grouped_bar",
            "Sanitasi dan diare",
            [
                {
                    "faktor": factor,
                    "kategori": info["kategori"],
                    "berlabel": info["berlabel"],
                    "stunting": info["stunting"],
                    "proporsi_stunting": info["proporsi_stunting"],
                }

                for factor in (
                    "sanitasi_layak",
                    "riwayat_diare_3bln"
                )

                for info in factors.get(factor, [])
            ],
        ),

        (
            "12_tren_dataset",
            "line",
            "Tren bulanan dari dataset aktif",
            content["visualisasi"]["tren_bulanan_dataset"],
        ),
    ]

    charts = [
        {
            "id": ident,
            "jenis": kind,
            "judul": title,
            "data": data,
            "tersedia": bool(data),
            "catatan": (
                "Persentase menggunakan label valid "
                "dalam kelompok."
            ),
        }

        for ident, kind, title, data in specs
    ]

    return {
        "jumlah_spesifikasi": len(charts),

        "jumlah_tersedia": sum(
            chart["tersedia"]
            for chart in charts
        ),

        "charts": charts,

        "peringatan": (
            "Ini data grafik, bukan gambar. "
            "Tren 2021–2023 memakai sumber berbeda "
            "melalui /api/history/trend."
        ),
    }


def simple_insights(
    rows,
    mapping,
    filters=None
):
    active = filtered_rows(
        rows,
        mapping,
        filters
    )

    result: list[str] = []

    status = kpis(
        active,
        mapping
    )["stunting"]

    if status["persentase"] is not None:
        result.append(
            f"Dalam {status['penyebut']} catatan valid, "
            f"{status['pembilang']} berlabel stunting "
            f"({status['persentase']}%)."
        )

    for factor, description in (
        ("bblr", "berat lahir"),
        ("status_gizi_ibu", "gizi ibu"),
        ("kunjungan_posyandu_3bln", "kunjungan Posyandu"),
    ):
        groups = [
            g
            for g in distribution_by(
                active,
                mapping,
                factor
            )
            if g["berlabel"] >= 10
        ]

        if len(groups) >= 2:
            high = max(
                groups,
                key=lambda g: g["proporsi_stunting"] or 0
            )

            low = min(
                groups,
                key=lambda g: g["proporsi_stunting"] or 0
            )

            result.append(
                f"Pada {description}, kelompok "
                f"{high['kategori']} {high['proporsi_stunting']}% "
                f"(n={high['berlabel']}), dibanding "
                f"{low['kategori']} {low['proporsi_stunting']}% "
                f"(n={low['berlabel']})."
            )

    result.append(
        "Hubungan bersifat deskriptif "
        "dan tidak membuktikan sebab-akibat."
    )

    return result