"""
COCO AI Engine - Verbose Walkthrough
----------------------------------------
Run this directly to SEE what the AI engine is actually doing, step by
step, for a realistic patient - no Docker, no Postgres required.

    python3 explain_engine.py

This mirrors exactly what runs inside the real backend (same rules.py /
features.py / personalization.py / analytics.py / ml.py) - just with
print statements added so you can watch the reasoning happen.
"""

import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

from app.models.enums import GameType
from app.services.coco_engine import get_full_recommendation
from app.services.coco_engine.features import estimate_features
from app.services.coco_engine import rules


class MockSession:
    def __init__(self, score, duration_seconds, game_type, days_ago=0):
        self.score = score
        self.duration_seconds = duration_seconds
        self.game_type = game_type
        self.played_at = datetime.now(timezone.utc) - timedelta(days=days_ago)


class MockPatient:
    def __init__(self, cognitive_level, region, preferred_language):
        self.cognitive_level = cognitive_level
        self.region = region
        self.preferred_language = preferred_language


def line(char="-", n=70):
    print(char * n)


def explain_single_session(label, score, duration, game_type):
    """Shows the raw math: score+duration -> estimated features -> performance_score"""
    accuracy, response_time, mistakes, attempts = estimate_features(score, duration, game_type)
    perf = rules.compute_performance_score(accuracy, response_time, mistakes, attempts)
    print(f"\n  {label}")
    print(f"    raw:        score={score}, duration_seconds={duration}, game_type={game_type.value}")
    print(f"    estimated:  accuracy={accuracy:.2f}  response_time={response_time:.1f}s/round  "
          f"mistakes={mistakes}/{attempts}")
    print(f"    -> performance_score = {perf:.3f}  "
          f"(weighted: 0.5*accuracy + 0.3*speed + 0.2*consistency)")


print("=" * 70)
print("COCO AI ENGINE - VERBOSE WALKTHROUGH")
print("=" * 70)

print("""
A patient plays a game. The raw data we get is just:
    score            (0-100, how well they did)
    duration_seconds (how long the whole session took)
    game_type        (which of the 3 games)

Everything downstream is derived from just those three things.
""")

line("=")
print("STEP 1 - How raw session data becomes a 'performance score'")
line("=")
explain_single_session("A strong session (Memory Match)", score=90, duration=45, game_type=GameType.MEMORY_MATCH)
explain_single_session("A weak session (Memory Match)", score=35, duration=350, game_type=GameType.MEMORY_MATCH)

print("""
Notice: performance_score blends accuracy, estimated speed, and estimated
consistency into ONE number the rest of the engine reasons about.
""")

line("=")
print("STEP 2 - Full AI engine on a realistic patient history")
line("=")

patient = MockPatient(cognitive_level=2, region="Assam", preferred_language="as")

sessions_desc = [
    MockSession(92, 40, GameType.MEMORY_MATCH, days_ago=0),
    MockSession(88, 45, GameType.MEMORY_MATCH, days_ago=1),
    MockSession(55, 90, GameType.SEQUENCE_RECALL, days_ago=2),
    MockSession(50, 95, GameType.SEQUENCE_RECALL, days_ago=3),
    MockSession(85, 50, GameType.OBJECT_RECOGNITION, days_ago=5),
]

print(f"\nPatient: cognitive_level={patient.cognitive_level}, region={patient.region}, "
      f"preferred_language={patient.preferred_language}")
print(f"Session history (most recent first):")
for s in sessions_desc:
    print(f"  - {s.game_type.value:20s} score={s.score:3d}  duration={s.duration_seconds}s  "
          f"{s.played_at.strftime('%Y-%m-%d')}")

# Simulate "My World" data existing (Module 8) - engine works with or without this
my_world_items = [
    {"id": "mw1", "name": "her daughter Priya", "success_rate": 0.4, "last_shown_at": "2026-08-20"},
    {"id": "mw2", "name": "her grandson Arjun", "success_rate": None, "last_shown_at": None},
]

result = get_full_recommendation(sessions_desc, patient, my_world_items=my_world_items)

line("=")
print("STEP 3 - The three AI engine outputs")
line("=")

print("\n[A] DIFFICULTY ENGINE")
d = result["difficulty"]
for k, v in d.items():
    print(f"    {k}: {v}")

print("\n[B] PERSONALIZATION ENGINE")
p = result["personalization"]
for k, v in p.items():
    print(f"    {k}: {v}")

print("\n[C] ANALYTICS ENGINE")
a = result["analytics"]
for k, v in a.items():
    print(f"    {k}: {v}")

line("=")
print("STEP 4 - Same patient, but with NO 'My World' photos yet")
line("=")
result_no_myworld = get_full_recommendation(sessions_desc, patient, my_world_items=None)
print("\n[B] PERSONALIZATION ENGINE (no My World data)")
for k, v in result_no_myworld["personalization"].items():
    print(f"    {k}: {v}")

print("""
Notice: it gracefully falls back to region-themed content ("Bihu &
Brahmaputra" for Assam) instead of personal photos - so the app is never
generic even before a caregiver has uploaded any photos.
""")

line("=")
print("DONE. This exact code path is what runs inside the real backend.")
line("=")
