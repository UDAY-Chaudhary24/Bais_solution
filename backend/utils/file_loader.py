"""
utils/file_loader.py
Loads uploaded files (model + CSV) into usable Python objects.
"""

import io
import joblib
import pandas as pd
from fastapi import UploadFile, HTTPException


async def load_dataset(file: UploadFile) -> pd.DataFrame:
    """Load an uploaded CSV into a pandas DataFrame."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Dataset must be a .csv file.")
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")
    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")
    return df


async def load_model(file: UploadFile):
    """Load an uploaded .pkl or .joblib model file."""
    if not (file.filename.endswith(".pkl") or file.filename.endswith(".joblib")):
        raise HTTPException(
            status_code=400, detail="Model must be a .pkl or .joblib file."
        )
    content = await file.read()
    try:
        model = joblib.load(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not load model: {e}")
    return model
