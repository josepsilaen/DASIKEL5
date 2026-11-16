"""Regression test untuk bug pemetaan, KPI, ETL, dan visualisasi."""
from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import analysis_engine as eng
from app.services.dataset_store import (
    clear_active_dataset,
    get_active_dataset,
)


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_state():
    clear_active_dataset()
    yield
    clear_active_dataset()


def active_dataset() -> dict[str, Any]:
    dataset = get_active_dataset()

    assert dataset is not None, (
        "Dataset aktif harus tersedia setelah upload."
    )

    return dataset


def upload_csv(csv_text: str):
    return client.post(
        "/api/data/upload-preview",
        files={
            "file": (
                "test.csv",
                csv_text.encode("utf-8"),
                "text/csv"
            )
        },
    )


def test_mapping_exact_and_no_collision():
    from app.services.data_parser import find_suggested_mapping

    correct = {
        "status_stunting": "status_stunting",
        "status_tb_u": "status_tb_u",
        "zs_tb_u": "zscore_tb_u",
        "lila_cm": "lila_balita_cm",
        "usia_ibu_tahun": "usia_ibu_tahun",
        "status_gizi_ibu": "status_gizi_ibu",
        "kunjungan_posyandu_3bln": "kunjungan_posyandu_3bln",
        "imunisasi_sesuai_usia": "imunisasi_sesuai_usia",
    }

    for column, expected in correct.items():
        assert find_suggested_mapping(column)[0] == expected

    assert find_suggested_mapping(
        "usia_ibu_tahun"
    ) != ("usia_saat_ukur", 1.0)


def test_numeric_binary_status_not_zero_on_dashboard():
    response = upload_csv(
        "usia_bulan,jenis_kelamin,berat_kg,tinggi_cm,status_stunting\n"
        "24,L,10,80,1\n"
        "12,P,7,72,0\n"
    )

    assert response.status_code == 200

    dashboard = client.get("/api/dashboard/summary").json()

    assert dashboard["stunted_count"] == 1
    assert dashboard["stunted_percentage"] == 50.0

    overview = client.get("/api/analytics/overview").json()

    assert overview["kpi"]["stunting"]["pembilang"] == 1


def test_conflicting_labels_not_silently_fixed():
    rows = [
        {
            "status_stunting": "1",
            "zs_tb_u": "0.2"
        },
        {
            "status_stunting": "0",
            "zs_tb_u": "-1"
        },
    ]

    mapping = {
        "status_stunting": "status_stunting",
        "zs_tb_u": "zscore_tb_u"
    }

    assert eng.target_status(
        rows[0],
        mapping
    ) == (None, True)

    assert eng.check_data(
        rows,
        mapping
    )["label_konflik"] == 1

    assert eng.kpis(
        rows,
        mapping
    )["stunting"]["penyebut"] == 1


def test_no_lila_balita_used_for_kek():
    csv_text = (
        "usia_bulan,jenis_kelamin,berat_kg,tinggi_cm,"
        "status_stunting,lila_cm,status_gizi_ibu\n"
        "24,L,11,80,1,12,Normal\n"
        "24,P,11,82,0,12,KEK\n"
    )

    assert upload_csv(csv_text).status_code == 200

    dashboard = client.get("/api/dashboard/summary").json()

    section = dashboard["tableau_analytics"][
        "section5_maternal_factors"
    ]

    assert section["kek_risk_rate"] == 50.0
    assert dashboard["kpi"]["kek_ibu"]["pembilang"] == 1


def test_reject_forged_and_incorrect_mapping_does_not_modify_active():
    assert upload_csv(
        "usia_bulan,jenis_kelamin,berat_kg,tinggi_cm,status_stunting\n"
        "24,L,10,80,1\n"
    ).status_code == 200

    original = active_dataset()["column_mapping"].copy()

    forged = {
        "column_mapping": {
            "nonexistent": "usia_saat_ukur",
            "a": "jenis_kelamin",
            "b": "tinggi_badan",
            "c": "berat_badan",
        }
    }

    response = client.post(
        "/api/data/validate-mapping",
        json=forged
    )

    assert response.status_code == 422

    assert active_dataset()["column_mapping"] == original

    wrong = {
        "column_mapping": {
            "status_stunting": "status_tb_u",
            "usia_bulan": "usia_saat_ukur",
            "jenis_kelamin": "jenis_kelamin",
            "tinggi_cm": "tinggi_badan",
            "berat_kg": "berat_badan",
        }
    }

    response = client.post(
        "/api/data/validate-mapping",
        json=wrong
    )

    assert response.status_code == 422
    assert active_dataset()["column_mapping"] == original


def test_analysis_filter_does_not_include_raw_dataset_in_response():
    assert upload_csv(
        "usia_bulan,jenis_kelamin,berat_kg,tinggi_cm,"
        "kecamatan,status_stunting\n"
        "24,L,10,80,BALIGE,1\n"
        "24,P,10,85,SILAEN,0\n"
    ).status_code == 200

    result = client.get("/api/analytics/overview").json()

    assert result["filter_aktif"] == {}
    assert result["total_setelah_filter"] == 2

    filtered = client.get(
        "/api/analytics/overview?kecamatan=BALIGE"
    ).json()

    assert filtered["kpi"]["stunting"]["pembilang"] == 1

    dashboard = client.get(
        "/api/dashboard/summary?kecamatan=BALIGE"
    ).json()

    assert dashboard["total_records"] == 1


def test_etl_never_changes_data_without_confirmation():
    assert upload_csv(
        "usia_bulan,jenis_kelamin,berat_kg,tinggi_cm,"
        "bb_lahir_kg,status_stunting\n"
        "24,L,10,80,2500,1\n"
    ).status_code == 200

    before = active_dataset()["rows"][0]["bb_lahir_kg"]

    preview = client.get("/api/data/etl/preview").json()

    assert preview["audit"]["jumlah_perubahan"] == 1

    assert active_dataset()["rows"][0]["bb_lahir_kg"] == before

    response = client.post(
        "/api/data/etl/apply",
        json={"setuju": False}
    )

    assert response.status_code == 422

    response = client.post(
        "/api/data/etl/apply",
        json={"setuju": True}
    )

    assert response.status_code == 200

    assert active_dataset()["rows"][0]["bb_lahir_kg"] == "2.500"


def test_export_does_not_expose_pii():
    assert upload_csv(
        "NIK,Nama Balita,usia_bulan,jenis_kelamin,"
        "berat_kg,tinggi_cm,status_stunting\n"
        "1234567890123456,Siti,24,P,9,78,0\n"
    ).status_code == 200

    exported = client.get("/api/data/etl/export.csv")

    assert exported.status_code == 200

    content = exported.content.decode("utf-8-sig")

    assert "1234567890123456" not in content
    assert "Siti" not in content
    assert "usia_saat_ukur" in content


def test_12_charts_derived_from_dataset():
    assert upload_csv(
        "usia_bulan,jenis_kelamin,berat_kg,tinggi_cm,"
        "bb_lahir_kg,kecamatan,status_stunting\n"
        "24,L,10,80,2.3,BALIGE,1\n"
        "24,P,10,85,3.2,SILAEN,0\n"
    ).status_code == 200

    response = client.get("/api/analytics/charts")

    assert response.status_code == 200

    data = response.json()

    assert data["jumlah_spesifikasi"] == 12
    assert data["charts"][0]["data"][0]["jumlah"] == 1


def test_history_requires_external_source():
    initial = client.get("/api/history/trend").json()

    assert "available" in initial

    response = client.post(
        "/api/history/upload",
        data={
            "source_url": "",
            "source_name": "-foo"
        },
        files={
            "file": (
                "hist.csv",
                b"tahun,jumlah_stunting,total_balita\n"
                b"2021,2,100\n"
                b"2022,3,100\n"
                b"2023,4,100\n"
            )
        },
    )

    assert response.status_code == 422