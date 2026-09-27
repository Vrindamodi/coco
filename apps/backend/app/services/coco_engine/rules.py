"""
COCO AI Engine - Layer 1: Deterministic Adaptive Rule Engine
--------------------------------------------------------------
This is the ALWAYS-ON, always-explainable core of the difficulty engine.
It never fails, needs no training, and is what the system falls back to
if the ML layer (Layer 2) is unavailable or disagrees strongly.

Logic is inspired by Elo/IRT-style skill rating:
    1. Convert a session's raw stats into a single performance_score.
    2. Compare performance_score to what was "expected" at the current level.
    3. Use a short streak counter to avoid noisy level flapping - important
       for elderly/dementia users who need STABILITY, not erratic jumps.
"""

MIN_LEVEL = 1
MAX_LEVEL = 5

# Weights for the performance score formula
W_ACCURACY = 0.5
W_SPEED = 0.3
W_CONSISTENCY = 0.2

# Response time bounds used to normalize speed (seconds).
# Calibrated for ELDERLY/DEMENTIA users doing one round of a cognitive game -
# not fast-reaction-time gaming. 3s = a quick, confident response; 45s = a
# slow, effortful one. (Original 1.5-15s range was too tight and was
# clamping every real session to "maximally slow" - see features.py note.)
MIN_TIME = 3.0
MAX_TIME = 45.0

INCREASE_THRESHOLD = 0.75
DECREASE_THRESHOLD = 0.40
STREAK_NEEDED_TO_INCREASE = 2


def _normalize_time(t):
    t = max(MIN_TIME, min(MAX_TIME, t))
    return (t - MIN_TIME) / (MAX_TIME - MIN_TIME)  # 0 = fast, 1 = slow


def compute_performance_score(accuracy, response_time, mistakes, attempts):
    speed_score = 1 - _normalize_time(response_time)
    consistency_score = 1 - (mistakes / attempts if attempts > 0 else 0)
    consistency_score = max(0.0, min(1.0, consistency_score))

    score = (W_ACCURACY * accuracy
             + W_SPEED * speed_score
             + W_CONSISTENCY * consistency_score)
    return round(max(0.0, min(1.0, score)), 4)


def evaluate_performance(accuracy, response_time, mistakes, attempts,
                          current_level, history=None, streak_state=0):
    """
    Core rule-engine decision. `history` = list of recent performance_scores
    (most recent last). `streak_state` = consecutive good sessions carried
    in from the caller (e.g. from the patient's DB record) - defaults to 0
    if not provided, which just means "increase" needs 2 good sessions in
    the passed-in history/streak to trigger.
    """
    history = history or []
    performance_score = compute_performance_score(accuracy, response_time, mistakes, attempts)

    # update streak of consecutive "good" sessions (>= increase threshold)
    streak = streak_state + 1 if performance_score >= INCREASE_THRESHOLD else 0

    if performance_score >= INCREASE_THRESHOLD and streak >= STREAK_NEEDED_TO_INCREASE:
        decision = "increase"
        recommended_level = min(current_level + 1, MAX_LEVEL)
        reason = "Consistent strong performance across recent sessions"
    elif performance_score < DECREASE_THRESHOLD:
        decision = "decrease"
        recommended_level = max(current_level - 1, MIN_LEVEL)
        reason = "Performance below comfort threshold; reducing difficulty to rebuild confidence"
    else:
        decision = "stay"
        recommended_level = current_level
        reason = "Performance within target range; maintaining current level"

    # simple trend using history if we have enough points
    trend = "insufficient_data"
    if len(history) >= 2:
        slope = history[-1] - history[0]
        if slope > 0.05:
            trend = "improving"
        elif slope < -0.05:
            trend = "declining"
        else:
            trend = "stable"

    return {
        "performance_score": performance_score,
        "decision": decision,
        "recommended_level": recommended_level,
        "reason": reason,
        "streak": streak,
        "trend": trend,
    }
