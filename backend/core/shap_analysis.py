"""
core/shap_analysis.py
Computes SHAP values per demographic group and returns divergence scores.
High divergence → model treats groups differently on that feature → discrimination.
Mode 1 only (requires trained model).
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

MAX_KERNEL_ROWS = 200  # KernelExplainer is slow; cap background sample


def _encode_df(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in out.columns:
        try:
            out[col] = out[col].fillna(out[col].median())
        except TypeError:
            out[col] = out[col].astype("category").cat.codes
    return out.astype(float)


def compute_shap_divergence(
    model,
    df: pd.DataFrame,
    protected_col: str,
    target_col: str,
) -> dict[str, float]:
    """
    Compute |mean_SHAP_G1(feature) - mean_SHAP_G2(feature)| for every feature.

    Returns:
        dict mapping feature_name → divergence_score (sorted descending)
    """
    import shap

    feature_cols = [c for c in df.columns if c not in (target_col, protected_col)]
    df_enc = _encode_df(df[feature_cols])

    groups = df[protected_col].unique()
    if len(groups) < 2:
        return {}

    # Use first two groups for binary divergence
    g1_mask = df[protected_col] == groups[0]
    g2_mask = df[protected_col] == groups[1]

    X_g1 = df_enc[g1_mask].values
    X_g2 = df_enc[g2_mask].values

    # Select explainer based on model type
    try:
        explainer = shap.TreeExplainer(model)
        shap_g1 = explainer.shap_values(X_g1)
        shap_g2 = explainer.shap_values(X_g2)

        # TreeExplainer may return list (one per class) — take class 1 for binary
        if isinstance(shap_g1, list):
            shap_g1 = shap_g1[1] if len(shap_g1) > 1 else shap_g1[0]
            shap_g2 = shap_g2[1] if len(shap_g2) > 1 else shap_g2[0]

    except Exception:
        # Fallback to KernelExplainer with row cap
        background = df_enc.values
        if len(background) > MAX_KERNEL_ROWS:
            idx = np.random.choice(len(background), MAX_KERNEL_ROWS, replace=False)
            background = background[idx]

        explainer = shap.KernelExplainer(model.predict_proba, background)
        shap_g1 = explainer.shap_values(X_g1, nsamples=100)
        shap_g2 = explainer.shap_values(X_g2, nsamples=100)
        if isinstance(shap_g1, list):
            shap_g1 = shap_g1[1] if len(shap_g1) > 1 else shap_g1[0]
            shap_g2 = shap_g2[1] if len(shap_g2) > 1 else shap_g2[0]

    mean_g1 = np.mean(shap_g1, axis=0)
    mean_g2 = np.mean(shap_g2, axis=0)
    divergence = np.abs(mean_g1 - mean_g2)

    result = {feat: round(float(div), 6) for feat, div in zip(feature_cols, divergence)}
    return dict(sorted(result.items(), key=lambda kv: -kv[1]))
