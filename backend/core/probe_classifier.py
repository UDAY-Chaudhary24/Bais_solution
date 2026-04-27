"""
core/probe_classifier.py
For each feature cluster, trains a LogisticRegression probe to predict
the protected attribute. High ROC-AUC → cluster leaks protected info.

Y-axis of the negativity graph.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder


def _encode_series(series: pd.Series) -> np.ndarray:
    try:
        return series.fillna(series.median()).values
    except TypeError:
        le = LabelEncoder()
        return le.fit_transform(series.astype(str))

def _encode_df_subset(df: pd.DataFrame, cols: list[str]) -> np.ndarray:
    parts = []
    for col in cols:
        parts.append(_encode_series(df[col]).reshape(-1, 1))
    return np.hstack(parts).astype(float)


def score_clusters(
    df: pd.DataFrame,
    clusters: dict[str, list[str]],
    protected_col: str,
    cv_folds: int = 5,
) -> dict[str, float]:
    """
    Returns normalized bias score per cluster.

    bias_score = (roc_auc - 0.5) / 0.5
    Range: [0, 1]
      0.0 → cluster cannot predict protected attribute (safe)
      1.0 → cluster perfectly predicts protected attribute (max bias)
    """
    y = _encode_series(df[protected_col])
    n_classes = len(np.unique(y))

    results: dict[str, float] = {}

    for cluster_id, members in clusters.items():
        # Skip if protected col is the only member
        clean_members = [m for m in members if m != protected_col]
        if not clean_members:
            results[cluster_id] = 0.0
            continue

        X = _encode_df_subset(df, clean_members)

        try:
            model = LogisticRegression(max_iter=300, random_state=42)
            scoring = "roc_auc" if n_classes == 2 else "roc_auc_ovr_weighted"
            scores = cross_val_score(model, X, y, cv=cv_folds, scoring=scoring)
            raw_auc = float(np.mean(scores))
        except Exception:
            raw_auc = 0.5

        # Normalize: 0.5 AUC → 0.0 bias, 1.0 AUC → 1.0 bias
        normalized = max(0.0, (raw_auc - 0.5) / 0.5)
        results[cluster_id] = round(normalized, 4)

    return results