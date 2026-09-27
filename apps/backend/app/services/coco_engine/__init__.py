"""
COCO Engine - Package Entry Point
--------------------------------------
High-level orchestration used by app/services/adaptive.py. Combines:
    features.py  -> estimate accuracy/response_time/mistakes/attempts
                     from the fields GameSession actually has today
    rules.py     -> Layer 1 deterministic adaptive difficulty logic
    ml.py        -> Layer 2 trained-model cross-check (optional, degrades
                     gracefully if the model artifact isn't present)

Usage (see adaptive.py):
    result = recommend_difficulty(sessions_desc, cognitive_level)
    next_level = result["recommended_level"]
"""

from . import rules
from . import ml
from .features import estimate_features
from .personalization import recommend_personalization
from .analytics import analyze_performance


def recommend_difficulty(sessions_desc, cognitive_level: int) -> dict:
    """
    sessions_desc: list of GameSession ORM objects, most recent first
                    (i.e. `.order_by(GameSession.played_at.desc())`),
                    same query shape the original stub already used.
    cognitive_level: patient's current level (1-5), used both as the
                    starting point when there's no history and as the
                    `current_level` input for the rule engine otherwise.

    Returns a dict with at least `recommended_level` (int, 1-5) plus
    explanatory fields (`decision`, `reason`, `trend`, `confidence`,
    `ml_agrees`, `ml_prediction`) that callers can use now or later
    (e.g. a future richer /games/difficulty endpoint or caregiver
    dashboard "why did difficulty change" tooltip).
    """
    if not sessions_desc:
        # Cold start - identical fallback to the original stub so behavior
        # doesn't change for brand-new patients.
        return {
            "recommended_level": max(1, min(cognitive_level, 3)),
            "decision": "stay",
            "reason": "No session history yet; using safe starting level.",
            "trend": "insufficient_data",
            "confidence": 0.5,
            "ml_agrees": None,
            "ml_prediction": None,
        }

    sessions_asc = list(reversed(sessions_desc))  # oldest -> newest

    scored = []
    for s in sessions_asc:
        accuracy, response_time, mistakes, attempts = estimate_features(
            s.score, s.duration_seconds, s.game_type
        )
        performance_score = rules.compute_performance_score(
            accuracy, response_time, mistakes, attempts
        )
        scored.append({
            "accuracy": accuracy,
            "response_time": response_time,
            "mistakes": mistakes,
            "attempts": attempts,
            "performance_score": performance_score,
        })

    # streak of consecutive "good" sessions BEFORE the latest one
    history_scores = [s["performance_score"] for s in scored[:-1]]
    streak_state = 0
    for ps in history_scores:
        streak_state = streak_state + 1 if ps >= rules.INCREASE_THRESHOLD else 0

    latest = scored[-1]
    result = rules.evaluate_performance(
        accuracy=latest["accuracy"],
        response_time=latest["response_time"],
        mistakes=latest["mistakes"],
        attempts=latest["attempts"],
        current_level=cognitive_level,
        history=history_scores[-3:],
        streak_state=streak_state,
    )

    response = {
        "recommended_level": result["recommended_level"],
        "decision": result["decision"],
        "reason": result["reason"],
        "trend": result["trend"],
        "confidence": 0.75,
        "ml_agrees": None,
        "ml_prediction": None,
    }

    # ML cross-check (Layer 2) - purely additive, never overrides Layer 1
    recent_scores = [s["performance_score"] for s in scored[-3:]]
    rolling_perf_3 = sum(recent_scores) / len(recent_scores)

    pred, proba = ml.predict(
        accuracy=latest["accuracy"],
        response_time=latest["response_time"],
        mistakes=latest["mistakes"],
        attempts=latest["attempts"],
        current_level=cognitive_level,
        streak=result["streak"],
        rolling_perf_3=rolling_perf_3,
    )
    if pred is not None:
        response["ml_prediction"] = pred
        response["ml_agrees"] = (pred == result["decision"])
        response["confidence"] = round(proba, 3)
        if not response["ml_agrees"]:
            response["reason"] += f" (ML cross-check suggests '{pred}' - flagged for review)"

    return response


def get_full_recommendation(sessions_desc, patient, my_world_items: list | None = None) -> dict:
    """
    Top-level entry point matching COCO's three-branch AI engine design:

        AI ENGINE
          |-- Difficulty       (recommend_difficulty)
          |-- Personalization  (recommend_personalization)
          `-- Analytics        (analyze_performance)

    sessions_desc: list of GameSession-like objects, most recent first.
    patient: object/dict with .cognitive_level, .region, .preferred_language
        (matches the existing Patient model's fields - no new columns
        required for this to work today).
    my_world_items: optional list of Module 8 gallery entries; pass None
        until that table exists - personalization degrades gracefully to
        region-theme-only recommendations.

    Returns {"difficulty": {...}, "personalization": {...}, "analytics": {...}}
    - a single call a new richer endpoint (e.g. GET /games/ai-summary/{id})
    could expose to the mobile app and caregiver dashboard alike.
    """
    cognitive_level = getattr(patient, "cognitive_level", None) if not isinstance(patient, dict) \
        else patient.get("cognitive_level")
    region = getattr(patient, "region", None) if not isinstance(patient, dict) \
        else patient.get("region")
    preferred_language = getattr(patient, "preferred_language", None) if not isinstance(patient, dict) \
        else patient.get("preferred_language")

    difficulty = recommend_difficulty(sessions_desc, cognitive_level)
    personalization = recommend_personalization(
        sessions_desc, region=region, preferred_language=preferred_language,
        my_world_items=my_world_items,
    )
    analytics = analyze_performance(sessions_desc)

    return {
        "difficulty": difficulty,
        "personalization": personalization,
        "analytics": analytics,
    }
