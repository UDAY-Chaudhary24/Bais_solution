"""
core/negativity_graph.py
Plots the 2D negativity graph (bias score vs predictive contribution per cluster).
Returns PNG as base64 string + boundary equation string.
"""

import base64
import io
import math

import matplotlib
matplotlib.use("Agg")  # non-interactive backend — required for server use
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np


QUADRANT_COLORS = {
    "remove":   "#ef4444",   # top-left  — high bias, low predictive value → remove
    "decouple": "#f97316",   # top-right — high bias, high predictive value → Fair PCA
    "useless":  "#6b7280",   # bot-left  — low bias, low predictive value  → drop
    "safe":     "#22c55e",   # bot-right — low bias, high predictive value → keep
}


def _classify_quadrant(x: float, y: float, threshold: float = 1.0) -> str:
    """Classify a cluster point into a quadrant based on x/y scores."""
    risk = y / (x + 0.001)
    if x < 0.5 and y > 0.5:
        return "remove"
    elif x >= 0.5 and y > 0.5:
        return "decouple"
    elif x < 0.5 and y <= 0.5:
        return "useless"
    else:
        return "safe"


def generate_graph(
    cluster_ids: list[str],
    x_values: list[float],   # predictive contribution (ablation)
    y_values: list[float],   # bias score (probe classifier)
    threshold: float = 1.0,
) -> tuple[str, str, list[dict]]:
    """
    Generate negativity graph.

    Returns:
        image_b64: base64-encoded PNG string
        equation:  boundary equation string
        annotations: list of per-cluster dicts with quadrant, risk_score, x, y
    """
    fig, ax = plt.subplots(figsize=(9, 7))
    fig.patch.set_facecolor("#0f1117")
    ax.set_facecolor("#1a1d2e")

    # Grid
    ax.grid(color="#2d3148", linewidth=0.5, linestyle="--", alpha=0.7)
    ax.set_axisbelow(True)

    # Quadrant dividing lines
    ax.axhline(0.5, color="#475569", linewidth=1.0, linestyle=":")
    ax.axvline(0.5, color="#475569", linewidth=1.0, linestyle=":")

    # Boundary line y = threshold * x
    x_line = np.linspace(-0.15, 1.15, 200)
    y_line = threshold * x_line
    ax.plot(x_line, y_line, color="#818cf8", linewidth=1.5,
            linestyle="--", label=f"Boundary: y = {threshold:.1f}x", alpha=0.85)

    annotations = []

    for i, (cid, x, y) in enumerate(zip(cluster_ids, x_values, y_values)):
        quadrant = _classify_quadrant(x, y, threshold)
        risk_score = round(y / (x + 0.001), 4)
        color = QUADRANT_COLORS[quadrant]

        ax.scatter(x, y, color=color, s=160, zorder=5, edgecolors="white",
                   linewidths=0.6, alpha=0.95)

        # Label offset to avoid overlap
        offset_x = 0.015
        offset_y = 0.02
        label = cid.replace("cluster_", "C")
        ax.annotate(
            label,
            xy=(x, y),
            xytext=(x + offset_x, y + offset_y),
            fontsize=8,
            color="white",
            alpha=0.9,
            fontfamily="monospace",
        )

        annotations.append({
            "cluster_id": cid,
            "x": round(x, 4),
            "y": round(y, 4),
            "quadrant": quadrant,
            "risk_score": risk_score,
        })

    # Quadrant labels
    ax.text(0.05, 0.92, "REMOVE", color=QUADRANT_COLORS["remove"],
            fontsize=8, alpha=0.7, transform=ax.transAxes, fontweight="bold")
    ax.text(0.55, 0.92, "DECOUPLE", color=QUADRANT_COLORS["decouple"],
            fontsize=8, alpha=0.7, transform=ax.transAxes, fontweight="bold")
    ax.text(0.05, 0.08, "USELESS", color=QUADRANT_COLORS["useless"],
            fontsize=8, alpha=0.7, transform=ax.transAxes, fontweight="bold")
    ax.text(0.55, 0.08, "SAFE", color=QUADRANT_COLORS["safe"],
            fontsize=8, alpha=0.7, transform=ax.transAxes, fontweight="bold")

    # Axes styling
    ax.set_xlim(-0.1, 1.1)
    ax.set_ylim(-0.05, 1.1)
    ax.set_xlabel("Predictive Contribution (PR-AUC drop on ablation)",
                  color="#94a3b8", fontsize=10)
    ax.set_ylabel("Bias Score (Probe Classifier normalized AUC)",
                  color="#94a3b8", fontsize=10)
    ax.set_title("Negativity Graph — Feature Cluster Risk Map",
                 color="white", fontsize=13, fontweight="bold", pad=14)
    ax.tick_params(colors="#64748b")
    for spine in ax.spines.values():
        spine.set_edgecolor("#2d3148")

    # Legend
    legend_patches = [
        mpatches.Patch(color=QUADRANT_COLORS["remove"],   label="Remove (high bias, low value)"),
        mpatches.Patch(color=QUADRANT_COLORS["decouple"], label="Decouple (high bias, high value)"),
        mpatches.Patch(color=QUADRANT_COLORS["useless"],  label="Drop (low bias, low value)"),
        mpatches.Patch(color=QUADRANT_COLORS["safe"],     label="Keep (low bias, high value)"),
    ]
    ax.legend(handles=legend_patches, loc="lower right",
              facecolor="#1a1d2e", edgecolor="#2d3148",
              labelcolor="white", fontsize=8)

    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)

    image_b64 = base64.b64encode(buf.read()).decode("utf-8")
    equation = f"y = {threshold:.2f} × x   (risk_score = bias / (predictive + ε))"

    return image_b64, equation, annotations
