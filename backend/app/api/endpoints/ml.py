from typing import Any
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel
from app.services.dataset_store import get_active_dataset
from app.services import ml_service

router=APIRouter(prefix="/ml",tags=["Klasifikasi Machine Learning"])

class TrainRequest(BaseModel):
    setuju:bool=False

class PredictRequest(BaseModel):
    fitur:dict[str,Any]

@router.post("/train")
def train(request:TrainRequest):
    if not request.setuju:raise HTTPException(422,"Pelatihan memerlukan setuju=true.")
    ds=get_active_dataset()
    if not ds:raise HTTPException(409,"Belum ada dataset aktif.")
    try:return ml_service.train(ds["rows"],ds["column_mapping"])
    except ValueError as e:raise HTTPException(422,str(e))

@router.get("/metrics")
def metrics():
    return ml_service.report()

@router.post("/predict")
def predict(request:PredictRequest):
    try:return ml_service.predict(request.fitur)
    except ValueError as e:raise HTTPException(422,str(e))

@router.post("/save")
def save():
    try:return ml_service.save_internal_model()
    except ValueError as e:raise HTTPException(422,str(e))

@router.post("/load")
def load():
    try:return ml_service.load_internal_model()
    except ValueError as e:raise HTTPException(422,str(e))
