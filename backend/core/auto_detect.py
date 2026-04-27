"""
core/auto_detect.py
Suggests likely protected attribute columns using two methods:
  Method A — Vocabulary scan (fuzzy match against known protected-attribute keywords)
  Method B — MI scan (high MI with any other column = potentially entangled)

Used by Mode 1 to suggest columns before user confirms.
"""

import pandas as pd
from difflib import SequenceMatcher

PROTECTED_VOCAB = [
    "race", "gender", "sex", "age", "religion", "nationality",
    "zip", "zipcode", "postal", "ethnicity", "disability",
    "marital", "married", "origin", "immigrant", "citizen",
    "income_group", "caste", "tribe", "color", "colour",
]

MI_THRESHOLD = 0.4
VOCAB_SIMILARITY_THRESHOLD = 0.75


def _vocab_score(col_name: str) -> tuple[float, str]:
    """Return (similarity_score, matched_keyword) for a column name."""
    lower = col_name.lower().replace("_", " ").replace("-", " ")
    best_score = 0.0
    best_kw = ""
    for kw in PROTECTED_VOCAB:
        score = SequenceMatcher(None, lower, kw).ratio()
        # Also check substring match
        if kw in lower or lower in kw:
            score = max(score, 0.9)
        if score > best_score:
            best_score = score
            best_kw = kw
    return best_score, best_kw


def suggest_protected_attributes(
    df: pd.DataFrame,
    mi_df: pd.DataFrame | None = None,
) -> list[dict]:
    """
    Returns list of suggested columns, each with:
        {
            "column": str,
            "confidence": float (0–1),
            "reason": "vocabulary" | "mi_entanglement" | "both"
        }
    Sorted by confidence descending.
    """
    cols = df.columns.tolist()
    suggestions: dict[str, dict] = {}

    # Method A — vocabulary scan
    for col in cols:
        score, matched_kw = _vocab_score(col)
        if score >= VOCAB_SIMILARITY_THRESHOLD:
            suggestions[col] = {
                "column": col,
                "confidence": round(score, 3),
                "reason": "vocabulary",
                "matched_keyword": matched_kw,
            }

    # Method B — MI scan (if MI matrix provided)
    if mi_df is not None:
        for col in cols:
            if col not in mi_df.columns:
                continue
            row = mi_df[col].drop(col, errors="ignore")
            max_mi = float(row.max()) if len(row) > 0 else 0.0
            if max_mi >= MI_THRESHOLD:
                if col in suggestions:
                    suggestions[col]["reason"] = "both"
                    suggestions[col]["confidence"] = min(
                        1.0, suggestions[col]["confidence"] + 0.1
                    )
                else:
                    suggestions[col] = {
                        "column": col,
                        "confidence": round(min(max_mi, 1.0), 3),
                        "reason": "mi_entanglement",
                        "matched_keyword": None,
                    }

    result = sorted(suggestions.values(), key=lambda x: -x["confidence"])
    return result
