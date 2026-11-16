from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib

from app.services import analysis_engine as eng


NUMERIC_FEATURES = (
    "usia_saat_ukur",
    "berat_lahir",
    "usia_ibu_tahun",
    "kunjungan_posyandu_3bln",
)

CATEGORY_FEATURES = (
    "jenis_kelamin",
    "status_gizi_ibu",
    "asi_eksklusif",
    "sanitasi_layak",
    "riwayat_diare_3bln",
    "akses_air_bersih",
    "pendidikan_ibu",
    "imunisasi_sesuai_usia",
)

LEAKAGE_KEYS = {
    "zscore_tb_u",
    "status_tb_u",
    "status_stunting",
    "tinggi_badan",
    "berat_badan",
    "lila_balita_cm",
    "record_id",
    "tanggal_ukur",
    "puskesmas",
    "desa_kelurahan",
}

TRAIN_STATE: dict[str, Any] = {}

MODEL_FILE = (
    Path(__file__).resolve().parents[2]
    / "var"
    / "model_internal.joblib"
)


def training_data(
    rows: list[dict[str, Any]],
    mapping: dict[str, str]
):
    import pandas as pd

    if eng.source(mapping, "usia_saat_ukur") is None:
        raise ValueError(
            "Kolom usia balita wajib tersedia sebelum melatih model."
        )

    features = [
        name
        for name in (*NUMERIC_FEATURES, *CATEGORY_FEATURES)
        if eng.source(mapping, name) is not None
    ]

    if len(features) < 4:
        raise ValueError(
            "Minimal empat fitur risiko perlu dipetakan."
        )

    if set(features) & LEAKAGE_KEYS:
        raise ValueError(
            "Fitur yang menyebabkan target leakage tidak diizinkan."
        )

    records: list[dict[str, Any]] = []
    labels: list[int] = []

    excluded = {
        "label_kosong": 0,
        "konflik_label": 0,
        "usia_di_luar_cakupan": 0,
    }

    for row in rows:
        target, conflict = eng.target_status(row, mapping)

        if conflict:
            excluded["konflik_label"] += 1
            continue

        if target is None:
            excluded["label_kosong"] += 1
            continue

        age = eng.number(
            eng.value(row, mapping, "usia_saat_ukur")
        )

        if age is None or not (0 <= age < 60):
            excluded["usia_di_luar_cakupan"] += 1
            continue

        record: dict[str, Any] = {}

        for name in features:
            raw = eng.value(row, mapping, name)

            if name in NUMERIC_FEATURES:
                record[name] = eng.number(raw)

            elif name == "jenis_kelamin":
                record[name] = eng.normalize_gender(raw)

            else:
                record[name] = (
                    eng.text_value(raw)
                    if eng.present(raw)
                    else None
                )

        records.append(record)
        labels.append(int(target))

    if len(labels) < 100 or min(
        labels.count(0),
        labels.count(1)
    ) < 10:
        raise ValueError(
            "Diperlukan minimal 100 data berlabel "
            "dan 10 data per kelas."
        )

    return (
        pd.DataFrame(records),
        pd.Series(labels),
        features,
        excluded,
    )


def train(
    rows: list[dict[str, Any]],
    mapping: dict[str, str],
    save_model: bool = False
):
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression

    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )

    from sklearn.model_selection import (
        GridSearchCV,
        StratifiedKFold,
        train_test_split,
    )

    from sklearn.pipeline import Pipeline

    from sklearn.preprocessing import (
        OneHotEncoder,
        StandardScaler,
    )

    from sklearn.tree import DecisionTreeClassifier

    # 1. Siapkan data
    features_data, target, features, excluded = training_data(
        rows,
        mapping
    )

    # 2. Pembagian data latih 80% dan data uji 20%
    x_train, x_test, y_train, y_test = train_test_split(
        features_data,
        target,
        test_size=0.2,
        stratify=target,
        random_state=42,
    )

    numeric = [
        name for name in features
        if name in NUMERIC_FEATURES
    ]

    categories = [
        name for name in features
        if name in CATEGORY_FEATURES
    ]

    # 3. Preprocessing numerik dan kategorikal
    preprocess = ColumnTransformer([
        (
            "numeric",
            Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]),
            numeric,
        ),

        (
            "category",
            Pipeline([
                (
                    "imputer",
                    SimpleImputer(
                        strategy="constant",
                        fill_value="Tidak diketahui",
                    ),
                ),
                (
                    "onehot",
                    OneHotEncoder(handle_unknown="ignore"),
                ),
            ]),
            categories,
        ),
    ])

    # 4. Tiga algoritma klasifikasi
    models: dict[str, tuple[Any, dict[str, list[Any]]]] = {
        "Logistic Regression": (
            LogisticRegression(
                max_iter=1000,
                class_weight="balanced",
                random_state=42,
            ),
            {
                "model__C": [0.1, 1.0, 10.0],
            },
        ),

        "Decision Tree": (
            DecisionTreeClassifier(
                class_weight="balanced",
                random_state=42,
            ),
            {
                "model__max_depth": [3, 5, 8],
                "model__min_samples_leaf": [3, 8],
            },
        ),

        "Random Forest": (
            RandomForestClassifier(
                n_estimators=120,
                class_weight="balanced",
                random_state=42,
                n_jobs=1,
            ),
            {
                "model__max_depth": [4, 8, None],
                "model__min_samples_leaf": [2, 5],
            },
        ),
    }

    # 5. Cross-validation tiga fold
    cv = StratifiedKFold(
        n_splits=3,
        shuffle=True,
        random_state=42,
    )

    results: list[dict[str, Any]] = []
    fitted_models: dict[str, Any] = {}

    # 6. Pelatihan dan evaluasi setiap algoritma
    for name, (estimator, params) in models.items():

        pipeline = Pipeline([
            ("preprocessor", preprocess),
            ("model", estimator),
        ])

        search = GridSearchCV(
            pipeline,
            params,
            scoring="f1",
            cv=cv,
            n_jobs=1,
            refit=True,
            error_score="raise",
        )

        # Tuning dilakukan hanya pada data train
        search.fit(x_train, y_train)

        best: Any = search.best_estimator_

        prediction = best.predict(x_test)

        probability = best.predict_proba(x_test)[:, 1]

        results.append({
            "model": name,

            "accuracy": round(
                float(accuracy_score(y_test, prediction)),
                4
            ),

            "precision_stunting": round(
                float(
                    precision_score(
                        y_test,
                        prediction,
                        zero_division=0,
                    )
                ),
                4
            ),

            "recall_stunting": round(
                float(
                    recall_score(
                        y_test,
                        prediction,
                        zero_division=0,
                    )
                ),
                4
            ),

            "f1_stunting": round(
                float(
                    f1_score(
                        y_test,
                        prediction,
                        zero_division=0,
                    )
                ),
                4
            ),

            "roc_auc": round(
                float(roc_auc_score(y_test, probability)),
                4
            ),

            "confusion_matrix": confusion_matrix(
                y_test,
                prediction,
                labels=[0, 1],
            ).tolist(),

            "cv_train_f1": round(
                float(search.best_score_),
                4
            ),

            "parameter_terbaik": search.best_params_,
        })

        fitted_models[name] = best

    # 7. Pemilihan model berdasarkan skor CV data latih
    selected = max(
        results,
        key=lambda item: item["cv_train_f1"],
    )["model"]

    # 8. Simpan hasil eksperimen ke memori server
    TRAIN_STATE.clear()

    TRAIN_STATE.update({
        "features": features,
        "numeric": numeric,
        "category": categories,
        "models": fitted_models,
        "selected_model": selected,
        "metrics": results,
        "excluded": excluded,
        "rows_train": len(x_train),
        "rows_test": len(x_test),
        "time_utc": datetime.now(timezone.utc).isoformat(),
    })

    if save_model:
        save_internal_model()

    return report()


def report() -> dict[str, Any]:
    if not TRAIN_STATE:
        return {
            "trained": False,
            "message": "Model belum dilatih di proses server ini.",
        }

    return {
        "trained": True,
        "model_terpilih": TRAIN_STATE["selected_model"],
        "fitur": TRAIN_STATE["features"],
        "metrik": TRAIN_STATE["metrics"],
        "jumlah_train": TRAIN_STATE["rows_train"],
        "jumlah_test": TRAIN_STATE["rows_test"],
        "baris_dikecualikan": TRAIN_STATE["excluded"],
        "waktu_utc": TRAIN_STATE["time_utc"],
        "peringatan": (
            "Model untuk eksperimen akademik; "
            "bukan diagnosis atau validasi klinis."
        ),
    }


def predict(payload: dict[str, Any]) -> dict[str, Any]:
    import pandas as pd

    if not TRAIN_STATE:
        raise ValueError("Latih model terlebih dahulu.")

    features: list[str] = TRAIN_STATE["features"]

    extra = set(payload) - set(features)
    missing = set(features) - set(payload)

    if extra:
        raise ValueError(
            "Fitur tidak diizinkan: "
            + ", ".join(sorted(extra))
        )

    if missing:
        raise ValueError(
            "Fitur belum diisi: "
            + ", ".join(sorted(missing))
        )

    # Validasi dan normalisasi input
    cleaned: dict[str, Any] = {}

    for name in features:
        raw = payload[name]

        if name in TRAIN_STATE["numeric"]:
            cleaned[name] = eng.number(raw)

        elif name == "jenis_kelamin":
            cleaned[name] = eng.normalize_gender(raw)

        else:
            cleaned[name] = (
                eng.text_value(raw)
                if eng.present(raw)
                else None
            )

    # Usia wajib valid
    age = eng.number(cleaned.get("usia_saat_ukur"))

    if age is None:
        raise ValueError("Usia balita wajib diisi.")

    if not 0 <= age < 60:
        raise ValueError("Usia balita harus 0–59 bulan.")

    model: Any = TRAIN_STATE["models"][
        TRAIN_STATE["selected_model"]
    ]

    probability = float(
        model.predict_proba(
            pd.DataFrame([cleaned])
        )[0, 1]
    )

    return {
        "kelas_prediksi": int(probability >= 0.5),
        "label": (
            "Stunting"
            if probability >= 0.5
            else "Tidak Stunting"
        ),
        "probabilitas_kelas_stunting": round(
            probability,
            4
        ),
        "model": TRAIN_STATE["selected_model"],
        "catatan": (
            "Probabilitas model bukan risiko klinis "
            "atau diagnosis medis."
        ),
    }


def save_internal_model() -> dict[str, Any]:
    """Menyimpan model machine learning yang sudah dilatih."""

    if not TRAIN_STATE:
        raise ValueError("Tidak ada model untuk disimpan.")

    MODEL_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    selected = TRAIN_STATE["selected_model"]

    saved = {
        "pipeline": TRAIN_STATE["models"][selected],
        "selected_model": selected,
        **{
            key: TRAIN_STATE[key]
            for key in (
                "features",
                "numeric",
                "category",
                "metrics",
                "excluded",
                "rows_train",
                "rows_test",
                "time_utc",
            )
        },
    }

    joblib.dump(saved, MODEL_FILE)

    return {
        "tersimpan": True,
        "file": "var/model_internal.joblib",
        "peringatan": (
            "Jangan memuat model Joblib "
            "dari sumber yang tidak dipercaya."
        ),
    }


def load_internal_model() -> dict[str, Any]:
    """Memuat kembali model yang tersimpan pada server."""

    if not MODEL_FILE.is_file():
        raise ValueError("Model internal belum tersedia.")

    saved = joblib.load(MODEL_FILE)

    selected = saved["selected_model"]

    TRAIN_STATE.clear()

    TRAIN_STATE.update({
        "models": {
            selected: saved["pipeline"]
        },
        "selected_model": selected,
        **{
            key: saved[key]
            for key in (
                "features",
                "numeric",
                "category",
                "metrics",
                "excluded",
                "rows_train",
                "rows_test",
                "time_utc",
            )
        },
    })

    return report()