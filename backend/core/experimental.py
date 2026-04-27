"""
core/experimental.py
Trains a lightweight RandomForest (n_estimators=10) for use in ablation.
Not meant to converge — only needs to give a rough predictive signal.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder


def _encode_series(series: pd.Series) -> np.ndarray:
    try:
        return series.fillna(series.median()).values
    except TypeError:
        le = LabelEncoder()
        return le.fit_transform(series.astype(str))


def _prepare(df: pd.DataFrame, target_col: str) -> tuple[np.ndarray, np.ndarray, bool]:
    """Return X, y arrays and whether task is classification."""
    feature_cols = [c for c in df.columns if c != target_col]
    parts = [_encode_series(df[col]).reshape(-1, 1) for col in feature_cols]
    X = np.hstack(parts).astype(float)
    y_raw = df[target_col]
    is_clf = y_raw.dtype == object or str(y_raw.dtype) == "category" or y_raw.nunique() <= 20
    y = _encode_series(y_raw)
    return X, y, is_clf, feature_cols


def train_experimental(
    df: pd.DataFrame,
    target_col: str,
    n_estimators: int = 10,
    random_state: int = 42,
):
    """
    Train a lightweight model on all features except target.

    Returns:
        model: fitted sklearn estimator
        feature_cols: list of feature column names (same order as X)
        is_clf: True if classification task
    """
    X, y, is_clf, feature_cols = _prepare(df, target_col)

    if is_clf:
        model = RandomForestClassifier(
            n_estimators=n_estimators, random_state=random_state, n_jobs=-1
        )
    else:
        model = RandomForestRegressor(
            n_estimators=n_estimators, random_state=random_state, n_jobs=-1
        )

    model.fit(X, y)
    return model, feature_cols, is_clf