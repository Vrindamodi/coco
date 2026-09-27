"""
COCO Engine - Component B: Personalization Engine
--------------------------------------------------------
Answers: "Which activity/content should be prioritized next?"

This is what makes COCO different from a generic cognitive-gaming app:
    generic app:  generic content -> generic user
    COCO:         user's world -> familiar content -> personalized activity

Three inputs feed the decision, in priority order:
  1. My World data (photos/people the caregiver has uploaded) - most
     personal, most engaging, used for spaced-repetition style recall
     ("haven't shown this person in the longest time" / "lowest
     recognition success rate - needs reinforcement").
  2. NER region + preferred_language - selects a culturally-familiar
     content theme (Bihu motifs for Assam, living-root-bridge imagery
     for Meghalaya, etc.) even when no personal photos exist yet.
  3. Per-domain performance history - identifies the patient's weakest
     cognitive domain (memory / attention / pattern) so activities can
     gently rebuild confidence there, rather than only chasing whatever
     domain happens to be shown next.

DB-agnostic by design (plain dicts/lists in, dict out) so it can be
tested standalone and wired into the real backend without pulling in
SQLAlchemy here.
"""

from . import rules
from .features import estimate_features

# ---- NER regional content themes -----------------------------------------
# Config-driven, not hardcoded logic - easy for the content/games team to
# extend as more regional art/audio packs are produced. Keys should match
# whatever region strings the Patient model actually stores (currently
# free-text, e.g. "Assam", "Meghalaya" - see seed.py).
REGION_THEMES = {
    "assam": {
        "theme_id": "assam_bihu",
        "label": "Bihu & Brahmaputra",
        "motifs": ["Bihu dance", "tea garden", "Brahmaputra river", "gamosa cloth", "rice fields"],
    },
    "meghalaya": {
        "theme_id": "meghalaya_hills",
        "label": "Khasi Hills",
        "motifs": ["living root bridge", "Khasi hills", "local orange orchard", "waterfalls"],
    },
    "manipur": {
        "theme_id": "manipur_classical",
        "label": "Manipuri Heritage",
        "motifs": ["Manipuri dance", "Loktak lake", "handloom textiles"],
    },
    "nagaland": {
        "theme_id": "nagaland_hornbill",
        "label": "Hornbill & Hills",
        "motifs": ["Hornbill festival", "Naga hills", "traditional shawls"],
    },
    "tripura": {
        "theme_id": "tripura_heritage",
        "label": "Tripura Heritage",
        "motifs": ["Unakoti carvings", "bamboo crafts", "hill terrain"],
    },
    "mizoram": {
        "theme_id": "mizoram_hills",
        "label": "Mizo Hills",
        "motifs": ["Chapchar Kut festival", "bamboo dance", "terraced hills"],
    },
    "arunachal pradesh": {
        "theme_id": "arunachal_monasteries",
        "label": "Monasteries & Mountains",
        "motifs": ["Tawang monastery", "orchids", "mountain villages"],
    },
    "sikkim": {
        "theme_id": "sikkim_himalaya",
        "label": "Himalayan Sikkim",
        "motifs": ["Kanchenjunga views", "monasteries", "cardamom farms"],
    },
}

DEFAULT_THEME = {
    "theme_id": "ner_general",
    "label": "North-East India (general)",
    "motifs": ["hill villages", "bamboo craft", "tea gardens", "local festivals"],
}

DOMAIN_GAME_TYPES = {
    "memory": ["memory_match"],
    "attention": ["sequence_recall"],
    "pattern": ["object_recognition"],
}


def _region_theme(region: str | None) -> dict:
    if not region:
        return DEFAULT_THEME
    return REGION_THEMES.get(region.strip().lower(), DEFAULT_THEME)


def _domain_for_game_type(game_type: str) -> str:
    for domain, types in DOMAIN_GAME_TYPES.items():
        if game_type in types:
            return domain
    return "unknown"


def _weakest_domain(sessions_scored_by_type: dict) -> str | None:
    """sessions_scored_by_type: {game_type: [performance_score, ...]}"""
    domain_scores = {}
    for game_type, scores in sessions_scored_by_type.items():
        if not scores:
            continue
        domain = _domain_for_game_type(game_type)
        domain_scores.setdefault(domain, []).extend(scores)

    if not domain_scores:
        return None

    domain_avgs = {d: sum(s) / len(s) for d, s in domain_scores.items()}
    return min(domain_avgs, key=domain_avgs.get)


def _pick_my_world_item(my_world_items: list) -> dict | None:
    """
    Spaced-repetition style selection: prioritize items with the lowest
    recognition success rate (needs reinforcement), breaking ties by
    whichever was shown longest ago (or never).

    my_world_items: list of dicts, each e.g.
        {"id": ..., "name": ..., "relationship": ...,
         "success_rate": 0.0-1.0 or None, "last_shown_at": iso-str or None}
    """
    if not my_world_items:
        return None

    def sort_key(item):
        success_rate = item.get("success_rate")
        success_rate = 1.0 if success_rate is None else success_rate  # unseen items aren't "failing"
        last_shown = item.get("last_shown_at") or ""  # empty string sorts first (never shown)
        return (success_rate, last_shown)

    return sorted(my_world_items, key=sort_key)[0]


def recommend_personalization(sessions_desc, region: str | None,
                               preferred_language: str | None = None,
                               my_world_items: list | None = None) -> dict:
    """
    sessions_desc: list of GameSession-like objects (or dicts with
        .score/.duration_seconds/.game_type, or the same as attributes),
        most recent first - same shape adaptive.py already queries.
    region: patient.region (free text, matched case-insensitively)
    preferred_language: patient.preferred_language - passed through for
        the voice module (Member 5) to select the right TTS/STT locale;
        this engine doesn't act on it directly.
    my_world_items: optional list of "My World" gallery entries (Module 8).
        Pass None/[] until that table exists - engine degrades gracefully
        to region-theme-only recommendations.

    Returns a dict describing what to serve next, with reasoning.
    """
    theme = _region_theme(region)
    my_world_items = my_world_items or []

    # Group estimated performance scores by game_type to find the weakest domain
    by_type: dict[str, list[float]] = {}
    for s in sessions_desc:
        game_type_value = s.game_type.value if hasattr(s.game_type, "value") else s.game_type
        accuracy, response_time, mistakes, attempts = estimate_features(
            s.score, s.duration_seconds, s.game_type
        )
        score = rules.compute_performance_score(accuracy, response_time, mistakes, attempts)
        by_type.setdefault(game_type_value, []).append(score)

    weakest_domain = _weakest_domain(by_type)
    my_world_pick = _pick_my_world_item(my_world_items)

    if my_world_pick:
        return {
            "recommended_domain": weakest_domain or "memory",
            "activity_hint": "photo_recall",  # from Module 8: Who's Who / Photo Recall / Person Matching
            "my_world_item_id": my_world_pick.get("id"),
            "content_theme": theme["theme_id"],
            "theme_label": theme["label"],
            "preferred_language": preferred_language,
            "my_world_available": True,
            "reason": (
                f"Using personal photo of {my_world_pick.get('name', 'a familiar person')} "
                f"to reinforce recognition (spaced-repetition selection) while gently "
                f"targeting the '{weakest_domain}' domain."
                if weakest_domain else
                f"Using personal photo of {my_world_pick.get('name', 'a familiar person')} "
                f"to build early engagement and comfort with the app."
            ),
        }

    return {
        "recommended_domain": weakest_domain or "memory",
        "activity_hint": None,
        "my_world_item_id": None,
        "content_theme": theme["theme_id"],
        "theme_label": theme["label"],
        "preferred_language": preferred_language,
        "my_world_available": False,
        "reason": (
            f"No personal 'My World' photos yet - using regionally familiar "
            f"'{theme['label']}' content, prioritizing the '{weakest_domain}' domain "
            f"where recent performance is comparatively weaker."
            if weakest_domain else
            f"No personal content or session history yet - starting with regionally "
            f"familiar '{theme['label']}' content across all domains."
        ),
    }
