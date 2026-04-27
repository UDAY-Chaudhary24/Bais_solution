"""
modes/mode1.py
Post-Training Explainer pipeline.

Endpoints:
  POST /mode1/suggest      → auto-suggest protected attributes from dataset
  POST /mode1/analyze      → SHAP divergence + ablation on uploaded model
"""

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from core.auto_detect import suggest_protected_attributes
from core.mi_matrix import compute_mi_matrix
from core.shap_analysis import compute_shap_divergence
from core.clustering import build_clusters
from core.ablation import compute_ablation
from utils.file_loader import load_dataset, load_model

router = APIRouter()


@router.post("/suggest")
async def suggest_columns(dataset: UploadFile = File(...)):
    """
    Auto-suggest likely protected attribute columns.
    Returns: list of {column, confidence, reason, matched_keyword}
    """
    df = await load_dataset(dataset)
    mi_df = compute_mi_matrix(df)
    suggestions = suggest_protected_attributes(df, mi_df)
    return JSONResponse({
        "suggestions": suggestions,
        "columns": df.columns.tolist(),
    })


@router.post("/analyze")
async def run_analysis(
    dataset: UploadFile = File(...),
    model_file: UploadFile = File(...),
    protected_col: str = Form(...),
    target_col: str = Form(...),
):
    """
    Run SHAP divergence per demographic group + ablation study.

    Returns:
        shap_divergence  — {feature: divergence_score} sorted descending
        ablation         — {cluster_id: predictive_contribution}
        clusters         — cluster → feature mapping
        risk_flags       — features with divergence above threshold
        groups           — unique values of protected_col found in data
    """
    df = await load_dataset(dataset)
    model = await load_model(model_file)

    if protected_col not in df.columns:
        return JSONResponse(
            {"error": f"Column '{protected_col}' not in dataset."}, status_code=400
        )
    if target_col not in df.columns:
        return JSONResponse(
            {"error": f"Column '{target_col}' not in dataset."}, status_code=400
        )

    # SHAP divergence
    shap_divergence = compute_shap_divergence(model, df, protected_col, target_col)

    # Clustering + ablation
    feature_df = df.drop(columns=[target_col, protected_col], errors="ignore")
    clusters = build_clusters(feature_df)
    raw_contributions, baseline = compute_ablation(df, clusters, target_col, is_clf=True)

    # Risk flags: features with divergence > 1 std above mean
    if shap_divergence:
        vals = list(shap_divergence.values())
        import numpy as np
        threshold = float(np.mean(vals) + np.std(vals))
        risk_flags = [f for f, v in shap_divergence.items() if v >= threshold]
    else:
        risk_flags = []

    groups = [str(g) for g in df[protected_col].unique().tolist()]

    return JSONResponse({
        "shap_divergence": shap_divergence,
        "ablation": raw_contributions,
        "clusters": {cid: members for cid, members in clusters.items()},
        "risk_flags": risk_flags,
        "groups": groups,
        "baseline_score": round(baseline, 4),
    })