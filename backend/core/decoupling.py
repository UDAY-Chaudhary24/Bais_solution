"""
core/decoupling.py
Removes protected-attribute signal from flagged feature clusters.

Two methods:
  top-left  quadrant → drop those columns entirely
  top-right quadrant → residualization (linear) or Fair PCA
"""

import io

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder


def _encode_col(series: pd.Series) -> np.ndarray:
    if series.dtype == object or str(series.dtype) == "category":
        le = LabelEncoder()
        return le.fit_transform(series.astype(str)).astype(float)
    return series.fillna(series.median()).values.astype(float)


def _residualize(df: pd.DataFrame, feature_col: str, protected_col: str) -> pd.Series:
    """
    Replace feature_col with its residuals after regressing on protected_col.
    Removes linear component of protected attribute from the feature.
    """
    X_prot = _encode_col(df[protected_col]).reshape(-1, 1)
    y_feat = _encode_col(df[feature_col])

    reg = LinearRegression().fit(X_prot, y_feat)
    residuals = y_feat - reg.predict(X_prot)
    return pd.Series(residuals, index=df.index, name=feature_col)


def _fair_pca(
    df: pd.DataFrame, cluster_cols: list[str], protected_col: str
) -> pd.DataFrame:
    """
    Project cluster features orthogonal to protected attribute via Fair PCA.

    z = protected_vector (normalized)
    X_debiased = X - (X @ z)[:, None] * z
    PCA on X_debiased gives components orthogonal to z.
    """
    X = np.column_stack([_encode_col(df[col]) for col in cluster_cols])
    z = _encode_col(df[protected_col]).astype(float)
    z_norm = z / (np.linalg.norm(z) + 1e-9)

    # Project out the protected dimension
    projections = (X @ z_norm).reshape(-1, 1) * z_norm.reshape(1, -1)
    X_debiased = X - projections

    # PCA to get orthogonal components
    n_components = min(len(cluster_cols), X_debiased.shape[0] - 1, X_debiased.shape[1])
    pca = PCA(n_components=n_components)
    X_fair = pca.fit_transform(X_debiased)

    col_names = [f"{cluster_cols[0]}_fairpca_{i}" for i in range(n_components)]
    return pd.DataFrame(X_fair, index=df.index, columns=col_names)


def apply_decoupling(
    df: pd.DataFrame,
    clusters: dict[str, list[str]],
    annotations: list[dict],   # from negativity_graph.generate_graph
    protected_col: str,
    target_col: str,
    method: str = "residualize",  # "residualize" | "fair_pca"
) -> tuple[pd.DataFrame, list[dict]]:
    """
    Apply decoupling to danger-zone clusters.

    Returns:
        debiased_df: modified DataFrame
        actions: list of {cluster_id, action, columns_affected}
    """
    df_out = df.copy()
    actions = []

    quadrant_map = {a["cluster_id"]: a["quadrant"] for a in annotations}

    for cluster_id, members in clusters.items():
        quadrant = quadrant_map.get(cluster_id, "safe")
        clean_members = [m for m in members if m not in (protected_col, target_col)]

        if not clean_members:
            continue

        if quadrant == "remove":
            # Drop entirely
            df_out = df_out.drop(columns=[c for c in clean_members if c in df_out.columns])
            actions.append({
                "cluster_id": cluster_id,
                "action": "dropped",
                "columns_affected": clean_members,
            })

        elif quadrant == "decouple":
            if method == "fair_pca":
                fair_cols = _fair_pca(df_out, clean_members, protected_col)
                df_out = df_out.drop(
                    columns=[c for c in clean_members if c in df_out.columns]
                )
                df_out = pd.concat([df_out, fair_cols], axis=1)
                actions.append({
                    "cluster_id": cluster_id,
                    "action": "fair_pca",
                    "columns_affected": clean_members,
                    "new_columns": fair_cols.columns.tolist(),
                })
            else:
                for col in clean_members:
                    if col in df_out.columns:
                        df_out[col] = _residualize(df_out, col, protected_col)
                actions.append({
                    "cluster_id": cluster_id,
                    "action": "residualized",
                    "columns_affected": clean_members,
                })

    return df_out, actions


def df_to_csv_bytes(df: pd.DataFrame) -> bytes:
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")
