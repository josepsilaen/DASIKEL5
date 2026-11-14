
"""Warehouse SQLite Stunting Toba: 1 fakta + 4 dimensi.

Catatan: dim_balita menyimpan kombinasi demografi, bukan satu anak per baris.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from app.services import analysis_engine as e

DB_PATH = Path(os.getenv(
    "STUNTING_WAREHOUSE_PATH",
    str(Path(__file__).resolve().parents[2] / "var" / "stunting_dw.sqlite3"),
))

TABLES = (
    "dim_waktu", "dim_wilayah", "dim_balita",
    "dim_faktor_risiko", "fact_pengukuran_balita",
)

DDL = """
PRAGMA foreign_keys=ON;
CREATE TABLE dim_waktu (
    id INTEGER PRIMARY KEY, tanggal TEXT UNIQUE
);
CREATE TABLE dim_wilayah (
    id INTEGER PRIMARY KEY, kecamatan TEXT, puskesmas TEXT, desa TEXT,
    UNIQUE(kecamatan, puskesmas, desa)
);
CREATE TABLE dim_balita (
    id INTEGER PRIMARY KEY, usia_bulan INTEGER, jenis_kelamin TEXT,
    kelompok_usia TEXT,
    UNIQUE(usia_bulan, jenis_kelamin, kelompok_usia)
);
CREATE TABLE dim_faktor_risiko (
    id INTEGER PRIMARY KEY, status_gizi_ibu TEXT, asi_eksklusif TEXT,
    kunjungan_posyandu INTEGER, sanitasi_layak TEXT, diare TEXT,
    UNIQUE(status_gizi_ibu, asi_eksklusif, kunjungan_posyandu,
           sanitasi_layak, diare)
);
CREATE TABLE fact_pengukuran_balita (
    id INTEGER PRIMARY KEY,
    waktu_id INTEGER NOT NULL REFERENCES dim_waktu(id),
    wilayah_id INTEGER NOT NULL REFERENCES dim_wilayah(id),
    balita_id INTEGER NOT NULL REFERENCES dim_balita(id),
    faktor_id INTEGER NOT NULL REFERENCES dim_faktor_risiko(id),
    status_stunting INTEGER, berat_lahir_kg REAL, berat_kg REAL,
    CHECK(status_stunting IS NULL OR status_stunting IN (0, 1))
);
CREATE TABLE warehouse_meta (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    dataset_fingerprint TEXT NOT NULL,
    jumlah_baris_sumber INTEGER NOT NULL,
    dibuat_pada_utc TEXT NOT NULL
);
"""


def dataset_fingerprint(rows: list[dict], mapping: dict) -> str:
    payload = json.dumps(
        {"rows": rows, "mapping": mapping}, sort_keys=True,
        ensure_ascii=False, default=str, separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _clean(value: Any) -> str:
    return e.text_value(value) if e.present(value) else "Tidak diketahui"


def build(rows: list[dict], mapping: dict) -> dict[str, int]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp = DB_PATH.with_suffix(".tmp.sqlite3")
    if temp.exists():
        temp.unlink()

    conn = sqlite3.connect(temp)
    try:
        conn.executescript(DDL)
        cache: dict[str, dict[tuple, int]] = {
            key: {} for key in ("waktu", "wilayah", "balita", "faktor")
        }
        skipped = 0
        tables = {
            "waktu": ("dim_waktu", "tanggal"),
            "wilayah": ("dim_wilayah", "kecamatan,puskesmas,desa"),
            "balita": ("dim_balita", "usia_bulan,jenis_kelamin,kelompok_usia"),
            "faktor": (
                "dim_faktor_risiko",
                "status_gizi_ibu,asi_eksklusif,kunjungan_posyandu,sanitasi_layak,diare",
            ),
        }
        for row in rows:
            status, conflict = e.target_status(row, mapping)
            if conflict:
                skipped += 1
                continue

            age = e.number(e.value(row, mapping, "usia_saat_ukur"))
            visit = e.number(e.value(row, mapping, "kunjungan_posyandu_3bln"))
            risk = (
                _clean(e.value(row, mapping, "status_gizi_ibu")),
                _clean(e.value(row, mapping, "asi_eksklusif")),
                int(visit) if visit in (0, 1, 2, 3) else -1,
                _clean(e.value(row, mapping, "sanitasi_layak")),
                _clean(e.value(row, mapping, "riwayat_diare_3bln")),
            )
            keys = {
                "waktu": (_clean(e.value(row, mapping, "tanggal_ukur")),),
                "wilayah": (
                    _clean(e.value(row, mapping, "kecamatan")),
                    _clean(e.value(row, mapping, "puskesmas")),
                    _clean(e.value(row, mapping, "desa_kelurahan")),
                ),
                "balita": (
                    int(age) if age is not None and 0 <= age < 60 else -1,
                    e.normalize_gender(e.value(row, mapping, "jenis_kelamin")) or "Tidak diketahui",
                    e.group_age(age) or "Tidak diketahui",
                ),
                "faktor": risk,
            }
            ids: dict[str, int] = {}
            for group, values in keys.items():
                if values not in cache[group]:
                    table, columns = tables[group]
                    placeholders = ",".join("?" for _ in values)
                    conn.execute(
                        f"INSERT INTO {table} ({columns}) VALUES ({placeholders})",
                        values,
                    )
                    cache[group][values] = conn.execute(
                        "SELECT last_insert_rowid()"
                    ).fetchone()[0]
                ids[group] = cache[group][values]

            conn.execute(
                """INSERT INTO fact_pengukuran_balita
                   (waktu_id, wilayah_id, balita_id, faktor_id,
                    status_stunting, berat_lahir_kg, berat_kg)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    ids["waktu"], ids["wilayah"], ids["balita"], ids["faktor"],
                    int(status) if status is not None else None,
                    e.number(e.value(row, mapping, "berat_lahir")),
                    e.number(e.value(row, mapping, "berat_badan")),
                ),
            )

        conn.execute(
            """INSERT INTO warehouse_meta
               (id, dataset_fingerprint, jumlah_baris_sumber, dibuat_pada_utc)
               VALUES (1, ?, ?, datetime('now'))""",
            (dataset_fingerprint(rows, mapping), len(rows)),
        )
        violations = conn.execute("PRAGMA foreign_key_check").fetchall()
        if violations:
            raise ValueError(f"Relasi warehouse tidak valid: {len(violations)} pelanggaran")
        conn.commit()
        counts = {
            table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in TABLES
        }
        counts["baris_konflik_dikecualikan"] = skipped
    except Exception:
        conn.close()
        temp.unlink(missing_ok=True)
        raise
    else:
        conn.close()

    os.replace(temp, DB_PATH)
    return counts


def stats(rows: list[dict] | None = None, mapping: dict | None = None) -> dict:
    if not DB_PATH.exists():
        return {
            "tersedia": False, "sesuai_dataset_aktif": False,
            "catatan": "Warehouse belum dibangun.",
        }
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        counts = {
            table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in TABLES
        }
        try:
            metadata = conn.execute(
                """SELECT dataset_fingerprint, jumlah_baris_sumber, dibuat_pada_utc
                   FROM warehouse_meta WHERE id = 1"""
            ).fetchone()
        except sqlite3.OperationalError:
            metadata = None  # Warehouse lama perlu dibangun sekali lagi.

        violations = conn.execute("PRAGMA foreign_key_check").fetchall()
        is_current = bool(
            metadata is not None and rows is not None and mapping is not None
            and metadata[0] == dataset_fingerprint(rows, mapping)
        )
        return {
            "tersedia": True,
            "jumlah": counts,
            "sesuai_dataset_aktif": is_current,
            "integritas_referensi": not violations,
            "jumlah_pelanggaran_referensi": len(violations),
            "jumlah_baris_sumber_saat_build": metadata[1] if metadata else None,
            "dibangun_pada_utc": metadata[2] if metadata else None,
            "granularitas": {
                "dim_balita": "Kombinasi usia, jenis kelamin dan kelompok usia; bukan satu baris per anak",
                "fact_pengukuran_balita": "Satu baris per pengukuran tanpa konflik label",
            },
        }
    finally:
        conn.close()
