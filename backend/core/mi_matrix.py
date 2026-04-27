"""
core/mi_matrix.py
Computes pairwise mutual information between all feature columns.
Uses label encoding (not one-hot) to avoid MI inflation on categoricals.
"""

import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from sklearn.preprocessing import LabelEncoder


def _encode_column(series: pd.Series) -> np.ndarray:
    """Label-encode a categorical column; return numeric array."""
    le = LabelEncoder()
    return le.fit_transform(series.astype(str)).reshape(-1, 1)


def _to_numeric(series):
    try:
        return series.fillna(series.median()).values
    except TypeError:
        return series.astype("category").cat.codes.values


def compute_mi_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute pairwise MI for all columns in df.

    Returns a symmetric DataFrame (n_cols × n_cols) of MI scores.
    Diagonal is 0 by convention (self-MI inflates; not meaningful here).
    """
    cols = df.columns.tolist()
    n = len(cols)
    mi_vals = np.zeros((n, n))

    encoded = {col: _to_numeric(df[col]) for col in cols}

    for i, col_i in enumerate(cols):
        x = encoded[col_i].reshape(-1, 1)
        # Treat col_i as the reference; compute MI against every other col
        for j, col_j in enumerate(cols):
            if i == j:
                continue
            y = encoded[col_j]
            # Use classif if y looks like a classifier target (≤20 unique)
            n_unique = len(np.unique(y))
            try:
                if n_unique <= 20:
                    scores = mutual_info_classif(x, y, random_state=42, n_neighbors=3)
                else:
                    scores = mutual_info_regression(x, y, random_state=42, n_neighbors=3)
                mi_vals[i][j] = scores[0]
            except Exception:
                mi_vals[i][j] = 0.0

    mi_df = pd.DataFrame(mi_vals, index=cols, columns=cols)
    return mi_df


def high_mi_pairs(mi_df: pd.DataFrame, threshold: float = 0.4) -> list[dict]:
    """
    Return list of feature pairs with MI above threshold.
    Each entry: {"col_a": str, "col_b": str, "mi": float}
    """
    pairs = []
    cols = mi_df.columns.tolist()
    for i, ca in enumerate(cols):
        for j, cb in enumerate(cols):
            if j <= i:
                continue
            val = float(mi_df.loc[ca, cb])
            if val >= threshold:
                pairs.append({"col_a": ca, "col_b": cb, "mi": round(val, 4)})
    return sorted(pairs, key=lambda x: -x["mi"])