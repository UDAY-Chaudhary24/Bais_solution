"""
core/ablation.py
For each feature cluster, measures PR-AUC drop when that cluster is removed.
This is the X-axis of the negativity graph.

predictive_contribution(C) = PR-AUC(all) - PR-AUC(all except C)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import average_precision_score, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


def _encode_series(series: pd.Series) -> np.ndarray:
    try:
        return series.fillna(series.median()).values
    except TypeError:
        le = LabelEncoder()
        return le.fit_transform(series.astype(str))

def _build_X(df: pd.DataFrame, feature_cols: list[str]) -> np.ndarray:
    parts = [_encode_series(df[col]).reshape(-1, 1) for col in feature_cols]
    return np.hstack(parts).astype(float)


def _score_model(X_tr, X_te, y_tr, y_te, is_clf: bool, random_state: int = 42) -> float:
    """Train quick model and return PR-AUC (clf) or R² (regression)."""
    if is_clf:
        m = RandomForestClassifier(n_estimators=10, random_state=random_state, n_jobs=-1)
        m.fit(X_tr, y_tr)
        n_classes = len(np.unique(y_tr))
        if n_classes == 2:
            proba = m.predict_proba(X_te)[:, 1]
            try:
                return float(average_precision_score(y_te, proba))
            except Exception:
                return 0.5
        else:
            # Multiclass: macro-average PR-AUC approximation
            scores = []
            for cls_idx in range(n_classes):
                binary_y = (y_te == cls_idx).astype(int)
                if binary_y.sum() == 0:
                    continue
                proba = m.predict_proba(X_te)[:, cls_idx]
                try:
                    scores.append(average_precision_score(binary_y, proba))
                except Exception:
                    pass
            return float(np.mean(scores)) if scores else 0.5
    else:
        m = RandomForestRegressor(n_estimators=10, random_state=random_state, n_jobs=-1)
        m.fit(X_tr, y_tr)
        preds = m.predict(X_te)
        return float(max(r2_score(y_te, preds), 0.0))


def compute_ablation(
    df: pd.DataFrame,
    clusters: dict[str, list[str]],
    target_col: str,
    is_clf: bool,
    test_size: float = 0.25,
    random_state: int = 42,
) -> dict[str, float]:
    """
    Returns predictive_contribution per cluster.

    contribution(C) = baseline_score - score_without_C
    Positive → cluster helps prediction (right on X-axis)
    Near 0   → cluster is noise
    Negative → removing cluster improves model
    """
    all_feature_cols = [c for c in df.columns if c != target_col]
    y_raw = df[target_col]
    y = _encode_series(y_raw)

    X_all = _build_X(df, all_feature_cols)
    X_tr, X_te, y_tr, y_te = train_test_split(
        X_all, y, test_size=test_size, random_state=random_state
    )

    baseline = _score_model(X_tr, X_te, y_tr, y_te, is_clf, random_state)

    results: dict[str, float] = {}

    for cluster_id, members in clusters.items():
        # Features remaining after removing this cluster
        remaining = [c for c in all_feature_cols if c not in members]

        if not remaining:
            # Removing this cluster leaves nothing → maximum contribution
            results[cluster_id] = round(baseline, 4)
            continue

        X_rem = _build_X(df, remaining)
        X_tr_r, X_te_r, y_tr_r, y_te_r = train_test_split(
            X_rem, y, test_size=test_size, random_state=random_state
        )
        score_without = _score_model(X_tr_r, X_te_r, y_tr_r, y_te_r, is_clf, random_state)
        contribution = round(baseline - score_without, 4)
        results[cluster_id] = contribution

    return results, baseline