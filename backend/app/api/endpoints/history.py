from typing import Any
from fastapi import APIRouter,HTTPException,UploadFile,File,Form
import csv,io

router=APIRouter(prefix="/history",tags=["Tren historis 2021-2023"])
_HISTORICAL:dict[str,Any]={"data":[],"source":None}

@router.get("/trend")
def trend():
    if not _HISTORICAL["data"]:
        return {"available":False,"data":[],"message":"Belum ada data historis 2021–2023 dengan sumber yang dapat ditelusuri."}
    return {"available":True,**_HISTORICAL}

@router.post("/upload")
async def upload_history(file:UploadFile=File(...),source_url:str=Form(...),source_name:str=Form(...)):
    """CSV skema: tahun,jumlah_stunting,total_balita. Sumber harus disebutkan."""
    if not source_url.strip().startswith(("https://","http://")) or not source_name.strip():
        raise HTTPException(422,"Cantumkan sumber resmi (nama dan URL) yang bisa diperiksa.")
    content=await file.read()
    if len(content)>1024*1024:raise HTTPException(413,"File historis terlalu besar.")
    try:
        reader=csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
        if not reader.fieldnames or not {"tahun","jumlah_stunting","total_balita"}.issubset(reader.fieldnames):
            raise ValueError("Kolom wajib: tahun,jumlah_stunting,total_balita")
        data=[];seen=set()
        for row in reader:
            year=int(row["tahun"]);st=int(row["jumlah_stunting"]);total=int(row["total_balita"])
            if year not in {2021,2022,2023} or year in seen or st<0 or total<=0 or st>total:
                raise ValueError("Tahun harus unik 2021–2023, 0 ≤ stunting ≤ total, total > 0")
            seen.add(year)
            data.append({"tahun":year,"jumlah_stunting":st,"total_balita":total,"proporsi":round(st/total*100,2)})
        if len(data)!=3:raise ValueError("Wajib tiga baris untuk tahun 2021, 2022, dan 2023.")
    except (UnicodeDecodeError,ValueError,TypeError) as ex:
        raise HTTPException(422,f"Data historis tidak valid: {ex}")
    _HISTORICAL["data"]=sorted(data,key=lambda d:d["tahun"])
    _HISTORICAL["source"]={"nama":source_name.strip(),"url":source_url.strip(),"catatan":"Sumber yang disebut pengguna; perlu ditinjau metodologinya sebelum dibandingkan."}
    return {"available":True,**_HISTORICAL}
