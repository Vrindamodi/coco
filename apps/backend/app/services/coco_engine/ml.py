"""
COCO Engine - ML Cross-Check Layer
--------------------------------------
Loads the trained Random Forest (Layer 2) and exposes a safe prediction
function. If the model files aren't present (e.g. someone clones the repo
without pulling LFS/artifacts, or the model is mid-retrain), this degrades
gracefully to "no ML cross-check available" rather than crashing the
backend - the rule engine (rules.py) always works regardless.
"""

import os
import joblib

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
_MODEL_PATH = os.path.join(_MODEL_DIR, "difficulty_model.joblib")
_FEATURES_PATH = os.path.join(_MODEL_DIR, "model_features.joblib")

_model = None
_features = None

if os.path.exists(_MODEL_PATH) and os.path.exists(_FEATURES_PATH):
    try:
        _model = joblib.load(_MODEL_PATH)
        _features = joblib.load(_FEATURES_PATH)
    except Exception:
        # Corrupt/incompatible artifact - fail safe, rule engine still works
        _model = None
        _features = None


def is_available() -> bool:
    return _model is not None


def predict(accuracy, response_time, mistakes, attempts, current_level, streak, rolling_perf_3):
    """
    Returns (prediction: str, confidence: float) or (None, None) if the
    model isn't loaded. Caller (rules-driven adaptive.py) treats this as
    a cross-check only - never the primary decision.
    """
    if _model is None:
        return None, None

    import pandas as pd

    row = {
        "accuracy": accuracy,
        "response_time": response_time,
        "mistakes": mistakes,
        "attempts": attempts,
        "current_level": current_level,
        "streak": streak,
        "rolling_perf_3": rolling_perf_3,
    }
    X = pd.DataFrame([[row[f] for f in _features]], columns=_features)
    pred = _model.predict(X)[0]
    proba = float(max(_model.predict_proba(X)[0]))
    return pred, proba
