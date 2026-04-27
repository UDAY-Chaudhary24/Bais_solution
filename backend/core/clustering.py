"""
core/clustering.py
Groups correlated features into clusters using two complementary methods:
  - VIF (Variance Inflation Factor) — catches linear multicollinearity
  - Hierarchical dendrogram — catches mutual correlation in groups of 3+

Output: dict mapping cluster_id (str) → list of feature names
"""

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import squareform
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder


def _encode_df(df: pd.DataFrame) -> pd.DataFrame:
    """Return a fully numeric copy of df (label-encode categoricals)."""
    out = df.copy()
    for col in out.columns:
        try:
            out[col] = out[col].fillna(out[col].median())
        except TypeError:
            out[col] = out[col].astype("category").cat.codes
    return out.astype(float)

def compute_vif(df_numeric: pd.DataFrame) -> pd.Series:
    """
    Return VIF score for each column.
    VIF_i = 1 / (1 - R²_i)  where R²_i from regressing col_i on all others.
    """
    cols = df_numeric.columns.tolist()
    vif_scores = {}
    for col in cols:
        others = [c for c in cols if c != col]
        if not others:
            vif_scores[col] = 1.0
            continue
        X = df_numeric[others].values
        y = df_numeric[col].values
        try:
            reg = LinearRegression().fit(X, y)
            ss_res = np.sum((y - reg.predict(X)) ** 2)
            ss_tot = np.sum((y - y.mean()) ** 2)
            r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
            r2 = min(r2, 0.9999)
            vif_scores[col] = round(1 / (1 - r2), 4)
        except Exception:
            vif_scores[col] = 1.0
    return pd.Series(vif_scores)


def build_clusters(
    df: pd.DataFrame,
    vif_threshold: float = 5.0,
    dendro_threshold: float = 0.5,
) -> dict[str, list[str]]:
    """
    Cluster features using VIF + dendrogram.

    Returns:
        clusters: {"cluster_0": ["col_a", "col_b"], "cluster_1": ["col_c"], ...}
    """
    df_num = _encode_df(df)
    cols = df_num.columns.tolist()

    if len(cols) < 2:
        return {"cluster_0": cols}

    # --- Dendrogram clustering ---
    corr = df_num.corr().abs().fillna(0)
    # Distance matrix: 1 - |correlation|
    dist = 1 - corr
    dist_array = dist.values.copy()
    np.fill_diagonal(dist_array, 0)
    dist = pd.DataFrame(dist_array, index=dist.index, columns=dist.columns)

    # squareform expects a condensed distance vector
    condensed = squareform(dist.values, checks=False)
    condensed = np.clip(condensed, 0, None)  # numerical safety

    Z = linkage(condensed, method="average")
    labels = fcluster(Z, t=dendro_threshold, criterion="distance")

    dendro_clusters: dict[int, list[str]] = {}
    for col, label in zip(cols, labels):
        dendro_clusters.setdefault(int(label), []).append(col)

    # --- VIF refinement: split any cluster where a member has VIF < threshold ---
    # (If all members of a cluster have low VIF, they don't need to be grouped)
    vif_scores = compute_vif(df_num)

    final_clusters: dict[str, list[str]] = {}
    cluster_idx = 0

    for label_id, members in dendro_clusters.items():
        if len(members) == 1:
            final_clusters[f"cluster_{cluster_idx}"] = members
            cluster_idx += 1
        else:
            # Check if any member has high VIF — if yes, keep as cluster
            max_vif = max(vif_scores.get(m, 1.0) for m in members)
            if max_vif >= vif_threshold:
                final_clusters[f"cluster_{cluster_idx}"] = members
                cluster_idx += 1
            else:
                # Low multicollinearity — split into individual clusters
                for m in members:
                    final_clusters[f"cluster_{cluster_idx}"] = [m]
                    cluster_idx += 1

    return final_clusters