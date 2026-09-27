"""
COCO Engine - Component C: Performance Analytics Engine
------------------------------------------------------------
Answers: "What patterns are visible in the user's activity over time?"

Feeds the caregiver dashboard (Module 5/7): per-domain trend lines,
adherence (are they actually playing regularly?), and which domain most
needs clinical attention. Deliberately simple statistics (linear trend
slope, rolling averages, session counts) rather than a black-box model -
a caregiver-facing healthcare feature should be easy to explain and trust.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from . import rules
from .features import estimate_features
from .personalization import _domain_for_game_type


def _trend_from_scores(scores: list) -> tuple[float, str]:
    """Linear trend slope over a chronological list of scores."""
    n = len(scores)
    if n < 2:
        return 0.0, "insufficient_data"

    x_mean = (n - 1) / 2
    y_mean = sum(scores) / n
    numerator = sum((i - x_mean) * (s - y_mean) for i, s in enumerate(scores))
    denominator = sum((i - x_mean) ** 2 for i in range(n))
    slope = numerator / denominator if denominator else 0.0

    if slope < -0.01:
        trend = "declining"
    elif slope > 0.01:
        trend = "improving"
    else:
        trend = "stable"
    return round(slope, 5), trend


def analyze_performance(sessions_desc) -> dict:
    """
    sessions_desc: list of GameSession-like objects, most recent first
        (same query shape adaptive.py already uses - `.score`,
        `.duration_seconds`, `.game_type`, `.played_at`).

    Returns per-domain trends, overall trend, adherence (sessions in the
    last 7 days), strongest/weakest domain, and a decline alert flag -
    everything the caregiver dashboard needs for Module 5/7.
    """
    if not sessions_desc:
        return {
            "overall_trend": "insufficient_data",
            "overall_slope": 0.0,
            "decline_alert": False,
            "domains": {},
            "strongest_domain": None,
            "weakest_domain": None,
            "sessions_last_7_days": 0,
            "total_sessions": 0,
        }

    sessions_asc = list(reversed(sessions_desc))  # oldest -> newest, for trend math

    overall_scores = []
    by_domain: dict[str, list[float]] = defaultdict(list)

    for s in sessions_asc:
        accuracy, response_time, mistakes, attempts = estimate_features(
            s.score, s.duration_seconds, s.game_type
        )
        score = rules.compute_performance_score(accuracy, response_time, mistakes, attempts)
        overall_scores.append(score)

        game_type_value = s.game_type.value if hasattr(s.game_type, "value") else s.game_type
        domain = _domain_for_game_type(game_type_value)
        by_domain[domain].append(score)

    overall_slope, overall_trend = _trend_from_scores(overall_scores)

    domains = {}
    domain_avgs = {}
    for domain, scores in by_domain.items():
        slope, trend = _trend_from_scores(scores)
        avg = round(sum(scores) / len(scores), 4)
        domains[domain] = {
            "average_performance": avg,
            "trend": trend,
            "slope": slope,
            "sessions_played": len(scores),
        }
        domain_avgs[domain] = avg

    strongest_domain = max(domain_avgs, key=domain_avgs.get) if domain_avgs else None
    weakest_domain = min(domain_avgs, key=domain_avgs.get) if domain_avgs else None

    # adherence: sessions in the last 7 days (uses played_at, tz-aware)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=7)
    sessions_last_7_days = sum(
        1 for s in sessions_desc
        if getattr(s, "played_at", None) and s.played_at >= cutoff
    )

    # decline alert: overall or ANY single domain trending down meaningfully -
    # matches the "early cognitive intervention" requirement in the problem
    # statement. Per-domain is more clinically useful than a single blended
    # number (a patient can be improving at memory while declining at
    # attention, which a single trend would mask).
    domain_decline = any(d["trend"] == "declining" and d["slope"] < -0.02 for d in domains.values())
    decline_alert = (overall_trend == "declining" and overall_slope < -0.02) or domain_decline

    return {
        "overall_trend": overall_trend,
        "overall_slope": overall_slope,
        "decline_alert": decline_alert,
        "domains": domains,
        "strongest_domain": strongest_domain,
        "weakest_domain": weakest_domain,
        "sessions_last_7_days": sessions_last_7_days,
        "total_sessions": len(sessions_desc),
    }
