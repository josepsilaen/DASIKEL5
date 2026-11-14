from __future__ import annotations
from collections import Counter
from typing import Any
from app.services.analysis_engine import number, present

YES_NO_TARGETS={"asi_eksklusif","sanitasi_layak","akses_air_bersih","riwayat_diare_3bln","imunisasi_sesuai_usia","kelas_ibu_balita"}
YES={"1","true","y","ya","yes","iya","hadir"}
NO={"0","false","n","tidak","no","tdk"}

def transform_row(row: dict[str,Any],mapping:dict[str,str]):
    updated=row.copy(); actions=[]
    for column,target in mapping.items():
        if column not in row: continue
        original=row[column]
        if original is None: continue
        val=str(original).strip()
        if val!=str(original):
            updated[column]=val;actions.append((target,"trim_whitespace"))
        if target in YES_NO_TARGETS:
            val_normal=val.casefold()
            if val_normal in YES|NO:
                normalized="Ya" if val_normal in YES else "Tidak"
                if normalized!=val:
                    updated[column]=normalized
                    actions.append((target,"normalize_yes_no"))
        elif target=="berat_lahir":
            n=number(val)
            if n is not None and 100<n<=6000:
                updated[column]=f"{n/1000:.3f}"
                actions.append((target,"grams_to_kg"))
    return updated,actions


def transform_dataset(rows,mapping):
    result=[];counts=Counter();changed_rows=0
    for row in rows:
        new,actions=transform_row(row,mapping)
        result.append(new)
        if actions:changed_rows+=1
        for key,act in actions:counts[f"{key}:{act}"]+=1
    return result,{"jumlah_baris":len(rows),"baris_berubah":changed_rows,
                   "jumlah_perubahan":sum(counts.values()),"jenis_perubahan":dict(sorted(counts.items())),
                   "catatan":"Tidak mengisi nilai kosong atau mengubah label stunting otomatis."}
