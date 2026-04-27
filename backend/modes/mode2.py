"""
modes/mode2.py
Pre-Training Audit pipeline.

Endpoints:
  POST /mode2/columns      → column list from CSV
  POST /mode2/audit        → full audit: MI, clustering, probe, ablation, graph
  POST /mode2/decouple     → apply decoupling, return debiased CSV
"""

import json

import pandas as pd
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

from core.ablation import compute_ablation
from core.clustering import build_clusters
from core.decoupling import apply_decoupling, df_to_csv_bytes
from core.experimental import train_experimental
from core.mi_matrix import compute_mi_matrix, high_mi_pairs
from core.negativity_graph import generate_graph
from core.probe_classifier import score_clusters
from utils.file_loader import load_dataset

import io

router = APIRouter()


# ── Helper ────────────────────────────────────────────────────────────────────

def _normalise_contributions(raw: dict[str, float]) -> dict[str, float]:
    """Normalise predictive contribution values to [0, 1] range."""
    vals = list(raw.values())
    mn, mx = min(vals), max(vals)
    if mx == mn:
        return {k: 0.5 for k in raw}
    return {k: round((v - mn) / (mx - mn), 4) for k, v in raw.items()}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/columns")
async def get_columns(dataset: UploadFile = File(...)):
    """Return list of column names from uploaded CSV."""
    df = await load_dataset(dataset)
    return JSONResponse({"columns": df.columns.tolist(), "shape": list(df.shape)})


@router.post("/audit")
async def run_audit(
    dataset: UploadFile = File(...),
    protected_col: str = Form(...),
    target_col: str = Form(...),
    threshold: float = Form(1.0),
):
    """
    Run full Stage 1 audit + experimental training.

    Returns:
        graph_image  — base64 PNG
        equation     — boundary line string
        clusters     — cluster → feature mapping
        annotations  — per-cluster quadrant, x, y, risk_score
        mi_pairs     — top high-MI feature pairs
        baseline_score — baseline PR-AUC of experimental model
    """
    df = await load_dataset(dataset)

    if protected_col not in df.columns:
        return JSONResponse({"error": f"Column '{protected_col}' not found."}, status_code=400)
    if target_col not in df.columns:
        return JSONResponse({"error": f"Column '{target_col}' not found."}, status_code=400)

    # Feature-only df (exclude target from clustering scope)
    feature_df = df.drop(columns=[target_col])

    # 1. MI matrix on features
    mi_df = compute_mi_matrix(feature_df)
    mi_pairs = high_mi_pairs(mi_df, threshold=0.4)

    # 2. Cluster features (exclude protected col from clustering input
    #    but keep it in df for probe classifier)
    cluster_input = feature_df.drop(columns=[protected_col], errors="ignore")
    clusters = build_clusters(cluster_input)

    # 3. Probe classifier → Y-axis bias scores
    bias_scores = score_clusters(df, clusters, protected_col)

    # 4. Experimental model + ablation → X-axis predictive contributions
    model, feat_cols, is_clf = train_experimental(df, target_col)
    raw_contributions, baseline = compute_ablation(df, clusters, target_col, is_clf)
    predictive_contributions = _normalise_contributions(raw_contributions)

    # 5. Align cluster lists (both dicts share keys)
    cluster_ids = list(clusters.keys())
    x_vals = [predictive_contributions.get(cid, 0.0) for cid in cluster_ids]
    y_vals = [bias_scores.get(cid, 0.0) for cid in cluster_ids]

    # 6. Generate negativity graph
    image_b64, equation, annotations = generate_graph(
        cluster_ids, x_vals, y_vals, threshold
    )

    return JSONResponse({
        "graph_image": image_b64,
        "equation": equation,
        "clusters": {cid: members for cid, members in clusters.items()},
        "annotations": annotations,
        "mi_pairs": mi_pairs[:20],   # top 20
        "baseline_score": round(baseline, 4),
        "is_classification": is_clf,
    })


@router.post("/decouple")
async def run_decouple(
    dataset: UploadFile = File(...),
    protected_col: str = Form(...),
    target_col: str = Form(...),
    annotations_json: str = Form(...),   # JSON-encoded list of annotation dicts
    clusters_json: str = Form(...),       # JSON-encoded cluster dict
    method: str = Form("residualize"),    # "residualize" | "fair_pca"
):
    """
    Apply decoupling to danger-zone clusters. Returns debiased CSV.
    """
    df = await load_dataset(dataset)

    try:
        annotations = json.loads(annotations_json)
        clusters = json.loads(clusters_json)
    except Exception as e:
        return JSONResponse({"error": f"Invalid JSON payload: {e}"}, status_code=400)

    debiased_df, actions = apply_decoupling(
        df, clusters, annotations, protected_col, target_col, method=method
    )

    csv_bytes = df_to_csv_bytes(debiased_df)

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=debiased_dataset.csv",
            "X-Actions": json.dumps(actions),
        },
    )