"""
COCO Engine - Feature Estimation Layer
------------------------------------------
The current `game_sessions` table only stores `score` (0-100 int) and
`duration_seconds` (whole-session duration). The AI engine's rule/ML logic
was designed around per-round `accuracy`, `response_time`, `mistakes`,
`attempts`.

This module bridges that gap WITHOUT requiring a schema migration:
    score, duration_seconds, game_type  -->  accuracy, response_time,
                                              mistakes, attempts

This is an approximation layer, not a permanent design. Once the game
modules (Member 2) start sending true per-round stats (e.g. via a richer
GameSessionCreate payload + migrated columns), swap the estimated values
below for the real ones 1:1 - the rule engine and ML model don't change at
all, only where their inputs come from.

Per-GameType baselines are rough guesses tuned for a demo, not clinically
validated - reasonable to eyeball-adjust once real gameplay data exists.
"""

from app.models.enums import GameType

# Assumed number of rounds/items per game type (used to convert whole-session
# duration into an approximate "seconds per round" response time, and to
# give mistakes/attempts a denominator).
GAME_TYPE_ROUNDS = {
    GameType.MEMORY_MATCH: 10,
    GameType.SEQUENCE_RECALL: 8,
    GameType.OBJECT_RECOGNITION: 10,
}

# Fallback round count for any future GameType not yet listed above, so
# this never throws a KeyError if the enum grows.
DEFAULT_ROUNDS = 10

# Clamp bounds matching what the rule engine / trained model expect
# (see rules.py MIN_TIME/MAX_TIME - keeping these in sync avoids feeding
# the model out-of-distribution values). Calibrated for elderly users
# doing one round of a cognitive game, not fast-reaction gaming - a
# tighter range (e.g. 1.5-15s) clamps every real session to "slowest
# possible" and unfairly tanks the speed component of the score.
MIN_RESPONSE_TIME = 3.0
MAX_RESPONSE_TIME = 45.0


def estimate_features(score: int | None, duration_seconds: int | None, game_type: GameType):
    """
    Returns (accuracy, response_time, mistakes, attempts) estimated from
    the fields that actually exist on GameSession today.
    """
    attempts = GAME_TYPE_ROUNDS.get(game_type, DEFAULT_ROUNDS)

    # accuracy: score is assumed to be a 0-100 percentage/points value
    accuracy = max(0.0, min(1.0, (score or 0) / 100.0))

    # response_time: whole-session duration spread across estimated rounds,
    # clamped into the range the engine/model were designed for.
    if duration_seconds and duration_seconds > 0:
        response_time = duration_seconds / attempts
    else:
        # no duration recorded - assume a mid-range pace rather than 0,
        # which would look like an implausibly fast response.
        response_time = (MIN_RESPONSE_TIME + MAX_RESPONSE_TIME) / 2
    response_time = max(MIN_RESPONSE_TIME, min(MAX_RESPONSE_TIME, response_time))

    # mistakes: no per-round mistake tracking yet, so approximate from the
    # accuracy gap. This is the roughest part of the estimation - flagged
    # clearly here so whoever revisits this knows exactly what to replace.
    mistakes = round((1 - accuracy) * attempts)
    mistakes = max(0, min(attempts, mistakes))

    return accuracy, response_time, mistakes, attempts
