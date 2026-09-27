"""Seed demo users, patients, reminders, game sessions, and My World items."""

import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import GameSession, Patient, Reminder, User, YogaVideo
from app.models.enums import (
    GameType,
    MediaType,
    MyWorldCategory,
    ReminderType,
    UserRole,
)
from app.models.my_world_item import MyWorldItem


# Stable demo IDs for hackathon / API docs
ADMIN_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")

CAREGIVER_1_ID = uuid.UUID("00000000-0000-4000-8000-000000000002")

CAREGIVER_2_ID = uuid.UUID("00000000-0000-4000-8000-000000000003")

PATIENT_1_ID = uuid.UUID("00000000-0000-4000-8000-000000000101")

PATIENT_2_ID = uuid.UUID("00000000-0000-4000-8000-000000000102")

PATIENT_3_ID = uuid.UUID("00000000-0000-4000-8000-000000000103")


DEMO_ADMIN_EMAIL = "admin@coco-demo.io"

DEMO_ADMIN_PASSWORD = "admin12345"

DEMO_CAREGIVER_EMAIL = "caregiver@coco-demo.io"

DEMO_CAREGIVER_PASSWORD = "caregiver12"


def seed_database(db: Session) -> None:
    # --------------------------------------------------------------------
    # Yoga videos
    # --------------------------------------------------------------------

    yoga_videos = [
        # -------------------- Breathing --------------------
        YogaVideo(
            title="Gentle Breathing",
            description="A simple breathing exercise to help with relaxation.",
            language="en",
            category="breathing",
            difficulty="beginner",
            video_uri="/yoga/gentle_breathing_en.mp4",
            thumbnail_uri="/yoga/thumbnails/gentle_breathing.jpg",
            duration=180,
            is_downloadable=True,
        ),
        YogaVideo(
            title="সহজ শ্বাস-প্ৰশ্বাস",
            description="আৰাম আৰু শান্তিৰ বাবে এটা সহজ শ্বাস-প্ৰশ্বাসৰ ব্যায়াম।",
            language="as",
            category="breathing",
            difficulty="beginner",
            video_uri="/yoga/gentle_breathing_as.mp4",
            thumbnail_uri="/yoga/thumbnails/gentle_breathing.jpg",
            duration=180,
            is_downloadable=True,
        ),

        # -------------------- Stretching --------------------
        YogaVideo(
            title="Gentle Morning Stretch",
            description="A gentle seated stretching routine for the morning.",
            language="en",
            category="stretching",
            difficulty="beginner",
            video_uri="/yoga/morning_stretch_en.mp4",
            thumbnail_uri="/yoga/thumbnails/morning_stretch.jpg",
            duration=300,
            is_downloadable=True,
        ),
        YogaVideo(
            title="পুৱাৰ কোমল ষ্ট্ৰেচিং",
            description="পুৱাৰ বাবে এটা সহজে বহি কৰিব পৰা ষ্ট্ৰেচিং ব্যায়াম।",
            language="as",
            category="stretching",
            difficulty="beginner",
            video_uri="/yoga/morning_stretch_as.mp4",
            thumbnail_uri="/yoga/thumbnails/morning_stretch.jpg",
            duration=300,
            is_downloadable=True,
        ),

        # -------------------- Mobility --------------------
        YogaVideo(
            title="Gentle Joint Movement",
            description="Slow and gentle movements to keep the joints flexible.",
            language="en",
            category="mobility",
            difficulty="beginner",
            video_uri="/yoga/joint_movement_en.mp4",
            thumbnail_uri="/yoga/thumbnails/joint_movement.jpg",
            duration=240,
            is_downloadable=True,
        ),
        YogaVideo(
            title="কোমল গাঁঠিৰ ব্যায়াম",
            description="গাঁঠিবোৰ নমনীয় কৰি ৰাখিবলৈ লাহে লাহে কৰা সহজ ব্যায়াম।",
            language="as",
            category="mobility",
            difficulty="beginner",
            video_uri="/yoga/joint_movement_as.mp4",
            thumbnail_uri="/yoga/thumbnails/joint_movement.jpg",
            duration=240,
            is_downloadable=True,
        ),

        # -------------------- Balance --------------------
        YogaVideo(
            title="Supported Balance",
            description="A gentle balance activity using a chair for support.",
            language="en",
            category="balance",
            difficulty="beginner",
            video_uri="/yoga/supported_balance_en.mp4",
            thumbnail_uri="/yoga/thumbnails/supported_balance.jpg",
            duration=240,
            is_downloadable=True,
        ),
        YogaVideo(
            title="সহায়তাৰে ভাৰসাম্য ব্যায়াম",
            description="চকীৰ সহায়তাৰে কৰা এটা সহজ ভাৰসাম্য ব্যায়াম।",
            language="as",
            category="balance",
            difficulty="beginner",
            video_uri="/yoga/supported_balance_as.mp4",
            thumbnail_uri="/yoga/thumbnails/supported_balance.jpg",
            duration=240,
            is_downloadable=True,
        ),

        # -------------------- Relaxation --------------------
        YogaVideo(
            title="Gentle Relaxation",
            description="A calm and simple relaxation session.",
            language="en",
            category="relaxation",
            difficulty="beginner",
            video_uri="/yoga/relaxation_en.mp4",
            thumbnail_uri="/yoga/thumbnails/relaxation.jpg",
            duration=300,
            is_downloadable=True,
        ),
        YogaVideo(
            title="কোমল শিথিলতা",
            description="শান্ত আৰু সহজে কৰিব পৰা এটা শিথিলতা ব্যায়াম।",
            language="as",
            category="relaxation",
            difficulty="beginner",
            video_uri="/yoga/relaxation_as.mp4",
            thumbnail_uri="/yoga/thumbnails/relaxation.jpg",
            duration=300,
            is_downloadable=True,
        ),
    ]

    # Insert Yoga videos only once.
    existing_yoga_uris = {uri[0] for uri in db.query(YogaVideo.video_uri).all()}
    new_yoga_videos = [v for v in yoga_videos if v.video_uri not in existing_yoga_uris]
    if new_yoga_videos:
        db.add_all(new_yoga_videos)
        db.commit()

    # Existing demo data is already seeded.
    if db.query(User).filter(User.email == DEMO_ADMIN_EMAIL).first():
        db.commit()
        # Still top up the memory journal, which is keyed on stable IDs and
        # may post-date the database this developer already has.
        seed_my_world(db)
        return

    now = datetime.now(timezone.utc)

    today = datetime.combine(
        now.date(),
        time.min,
        tzinfo=timezone.utc,
    )

    # --------------------------------------------------------------------
    # Users
    # --------------------------------------------------------------------

    admin = User(
        id=ADMIN_ID,
        email=DEMO_ADMIN_EMAIL,
        password_hash=hash_password(DEMO_ADMIN_PASSWORD),
        role=UserRole.ADMIN,
        full_name="Coco Admin",
        region="Assam",
    )

    caregiver1 = User(
        id=CAREGIVER_1_ID,
        email=DEMO_CAREGIVER_EMAIL,
        password_hash=hash_password(DEMO_CAREGIVER_PASSWORD),
        role=UserRole.CAREGIVER,
        full_name="Priya Sharma",
        phone="+91-98765-43210",
        region="Assam",
    )

    caregiver2 = User(
        id=CAREGIVER_2_ID,
        email="caregiver2@coco-demo.io",
        password_hash=hash_password("caregiver22"),
        role=UserRole.CAREGIVER,
        full_name="Meera Boro",
        region="Meghalaya",
    )

    db.add_all([admin, caregiver1, caregiver2])

    # --------------------------------------------------------------------
    # Patients
    # --------------------------------------------------------------------

    patient1 = Patient(
        id=PATIENT_1_ID,
        caregiver_id=CAREGIVER_1_ID,
        full_name="Lakshmi Devi",
        date_of_birth=date(1945, 3, 12),
        region="Assam",
        preferred_language="as",
        pin_hash=hash_password("1234"),
        cognitive_level=2,
    )

    patient2 = Patient(
        id=PATIENT_2_ID,
        caregiver_id=CAREGIVER_1_ID,
        full_name="Rajen Das",
        date_of_birth=date(1940, 8, 22),
        region="Assam",
        preferred_language="as",
        pin_hash=hash_password("5678"),
        cognitive_level=3,
    )

    patient3 = Patient(
        id=PATIENT_3_ID,
        caregiver_id=CAREGIVER_2_ID,
        full_name="Anjali Sharma",
        date_of_birth=date(1952, 11, 5),
        region="Meghalaya",
        preferred_language="en",
        pin_hash=hash_password("0000"),
        cognitive_level=1,
    )

    db.add_all([patient1, patient2, patient3])
    db.flush()
    # --------------------------------------------------------------------
    # Reminders
    # --------------------------------------------------------------------

    reminders = [
        Reminder(
            patient_id=PATIENT_1_ID,
            title="Morning medicine",
            reminder_type=ReminderType.MEDICINE,
            scheduled_at=today.replace(hour=9),
        ),
        Reminder(
            patient_id=PATIENT_1_ID,
            title="Drink a glass of water",
            reminder_type=ReminderType.HYDRATION,
            scheduled_at=today.replace(hour=11),
        ),
        Reminder(
            patient_id=PATIENT_1_ID,
            title="Doctor visit at clinic",
            reminder_type=ReminderType.APPOINTMENT,
            scheduled_at=today.replace(hour=14),
        ),
    ]

    db.add_all(reminders)

    # --------------------------------------------------------------------
    # Game session histories
    #
    # Lakshmi:
    # rough middle session, then strong recovery streak
    # -> AI recommends increase to level 3.
    #
    # Rajen:
    # steadily declining performance
    # -> AI recommends decrease and decline_alert=True.
    #
    # Anjali:
    # stable / mild improvement, demonstrating Meghalaya theme.
    # --------------------------------------------------------------------

    sessions = [
        # ---- Lakshmi Devi: dip then strong recovery -> increase ----

        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.MEMORY_MATCH,
            score=60,
            duration_seconds=150,
            difficulty_level=2,
            played_at=now - timedelta(days=8),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.SEQUENCE_RECALL,
            score=55,
            duration_seconds=160,
            difficulty_level=2,
            played_at=now - timedelta(days=7),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.MEMORY_MATCH,
            score=68,
            duration_seconds=120,
            difficulty_level=2,
            played_at=now - timedelta(days=6),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.OBJECT_RECOGNITION,
            score=70,
            duration_seconds=140,
            difficulty_level=2,
            played_at=now - timedelta(days=5),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.MEMORY_MATCH,
            score=78,
            duration_seconds=90,
            difficulty_level=2,
            played_at=now - timedelta(days=4),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.SEQUENCE_RECALL,
            score=82,
            duration_seconds=80,
            difficulty_level=2,
            played_at=now - timedelta(days=3),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.MEMORY_MATCH,
            score=45,
            duration_seconds=250,
            difficulty_level=2,
            played_at=now - timedelta(days=2),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.OBJECT_RECOGNITION,
            score=88,
            duration_seconds=80,
            difficulty_level=2,
            played_at=now - timedelta(days=1),
        ),
        GameSession(
            patient_id=PATIENT_1_ID,
            game_type=GameType.MEMORY_MATCH,
            score=91,
            duration_seconds=70,
            difficulty_level=2,
            played_at=now,
        ),

        # ---- Rajen Das: steady decline -> decrease + decline_alert ----

        GameSession(
            patient_id=PATIENT_2_ID,
            game_type=GameType.OBJECT_RECOGNITION,
            score=75,
            duration_seconds=120,
            difficulty_level=3,
            played_at=now - timedelta(days=6),
        ),
        GameSession(
            patient_id=PATIENT_2_ID,
            game_type=GameType.MEMORY_MATCH,
            score=70,
            duration_seconds=150,
            difficulty_level=3,
            played_at=now - timedelta(days=5),
        ),
        GameSession(
            patient_id=PATIENT_2_ID,
            game_type=GameType.OBJECT_RECOGNITION,
            score=62,
            duration_seconds=200,
            difficulty_level=3,
            played_at=now - timedelta(days=4),
        ),
        GameSession(
            patient_id=PATIENT_2_ID,
            game_type=GameType.MEMORY_MATCH,
            score=55,
            duration_seconds=250,
            difficulty_level=3,
            played_at=now - timedelta(days=3),
        ),
        GameSession(
            patient_id=PATIENT_2_ID,
            game_type=GameType.OBJECT_RECOGNITION,
            score=48,
            duration_seconds=300,
            difficulty_level=3,
            played_at=now - timedelta(days=2),
        ),
        GameSession(
            patient_id=PATIENT_2_ID,
            game_type=GameType.MEMORY_MATCH,
            score=40,
            duration_seconds=330,
            difficulty_level=3,
            played_at=now - timedelta(days=1),
        ),
        GameSession(
            patient_id=PATIENT_2_ID,
            game_type=GameType.OBJECT_RECOGNITION,
            score=35,
            duration_seconds=350,
            difficulty_level=3,
            played_at=now,
        ),

        # ---- Anjali Sharma: stable / mild improvement, Meghalaya theme ----

        GameSession(
            patient_id=PATIENT_3_ID,
            game_type=GameType.MEMORY_MATCH,
            score=58,
            duration_seconds=160,
            difficulty_level=1,
            played_at=now - timedelta(days=3),
        ),
        GameSession(
            patient_id=PATIENT_3_ID,
            game_type=GameType.SEQUENCE_RECALL,
            score=62,
            duration_seconds=144,
            difficulty_level=1,
            played_at=now - timedelta(days=2),
        ),
        GameSession(
            patient_id=PATIENT_3_ID,
            game_type=GameType.MEMORY_MATCH,
            score=60,
            duration_seconds=170,
            difficulty_level=1,
            played_at=now - timedelta(days=1),
        ),
        GameSession(
            patient_id=PATIENT_3_ID,
            game_type=GameType.OBJECT_RECOGNITION,
            score=65,
            duration_seconds=150,
            difficulty_level=1,
            played_at=now,
        ),
    ]

    db.add_all(sessions)

    # --------------------------------------------------------------------
    # My World demo data
    #
    # These are personalized memories used by the AI Personalization
    # Engine. Lower success_rate means the item needs more reinforcement.
    #
    # Lakshmi:
    #   Priya       -> 35% (priority candidate)
    #   Rohan       -> 80%
    #   Old house   -> 70%
    #
    # Rajen:
    #   Meena       -> 40% (priority candidate)
    #   Amit        -> 75%
    #
    # Anjali:
    #   Neha        -> 45% (priority candidate)
    #   Family garden -> 75%
    # --------------------------------------------------------------------

    seed_my_world(db)



    # Commit everything together
    db.commit()



def seed_my_world(db: Session) -> None:
    """Seeds the My World memory journal.

    Kept separate from `seed_database` and keyed on stable IDs so an existing
    development database - which returns early from the main seed - still
    picks up the journal entries.
    """

    my_world_items = [
        # ---- Lakshmi Devi ----

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001001"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.PERSON,
            name="Priya",
            relationship="daughter",
            description="Lakshmi's daughter Priya",
            photo_uri="https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400",
            media_type=MediaType.PHOTO,
            success_rate=0.35,
            times_shown=5,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001002"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.PERSON,
            name="Rohan",
            relationship="grandson",
            description="Lakshmi's grandson Rohan",
            photo_uri="https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400",
            media_type=MediaType.PHOTO,
            success_rate=0.80,
            times_shown=5,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001003"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.PLACE,
            name="Our old house",
            relationship=None,
            description="The family home",
            photo_uri="https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400",
            media_type=MediaType.PHOTO,
            success_rate=0.70,
            times_shown=5,
        ),

        # ---- Rajen Das ----

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001011"),
            patient_id=PATIENT_2_ID,
            category=MyWorldCategory.PERSON,
            name="Meena",
            relationship="daughter",
            description="Rajen's daughter Meena",
            photo_uri="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
            media_type=MediaType.PHOTO,
            success_rate=0.40,
            times_shown=4,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001012"),
            patient_id=PATIENT_2_ID,
            category=MyWorldCategory.PERSON,
            name="Amit",
            relationship="son",
            description="Rajen's son Amit",
            photo_uri="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            media_type=MediaType.PHOTO,
            success_rate=0.75,
            times_shown=4,
        ),

        # ---- Anjali Sharma ----

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001021"),
            patient_id=PATIENT_3_ID,
            category=MyWorldCategory.PERSON,
            name="Neha",
            relationship="daughter",
            description="Anjali's daughter Neha",
            photo_uri="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400",
            media_type=MediaType.PHOTO,
            success_rate=0.45,
            times_shown=3,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001022"),
            patient_id=PATIENT_3_ID,
            category=MyWorldCategory.PLACE,
            name="Family garden",
            relationship=None,
            description="The garden near their family home",
            photo_uri="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400",
            media_type=MediaType.PHOTO,
            success_rate=0.75,
            times_shown=3,
        ),

        # ---- Memory journal entries (Lakshmi) --------------------------
        # Reminiscence-therapy content the caregiver curates from the
        # dashboard. Photos are public Unsplash URLs so a fresh clone has a
        # non-empty gallery without Cloudinary credentials.

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001101"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.EVENT,
            name="Bihu at the village",
            relationship=None,
            description="Rongali Bihu with the whole family",
            story=(
                "Every spring the courtyard filled up for Rongali Bihu. You "
                "wore the mekhela sador your mother wove, and Priya danced "
                "with the neighbours' children until the dhol players got "
                "tired. You always made pitha for everyone who came."
            ),
            # Wikimedia Commons (CC): a real Rongali Bihu group with dhol players.
            photo_uri="https://commons.wikimedia.org/wiki/Special:FilePath/Bihu-Dance-assam.jpg?width=1200",
            thumbnail_uri="https://commons.wikimedia.org/wiki/Special:FilePath/Bihu-Dance-assam.jpg?width=400",
            media_type=MediaType.PHOTO,
            memory_date=date(1998, 4, 14),
            people=["Priya", "Rohan"],
            tags=["bihu", "festival", "village"],
            is_favourite=True,
            sort_order=0,
            times_shown=6,
            remembered_count=5,
            success_rate=0.83,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001102"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.PLACE,
            name="The tea garden",
            relationship=None,
            description="Where you worked for twenty years",
            story=(
                "You walked to the tea garden before sunrise, past the "
                "bamboo grove. You knew every row. The manager used to say "
                "nobody could pick two leaves and a bud faster than you."
            ),
            photo_uri="https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=400",
            media_type=MediaType.PHOTO,
            memory_date=date(1985, 6, 1),
            people=[],
            tags=["work", "tea garden", "assam"],
            sort_order=1,
            times_shown=4,
            remembered_count=3,
            success_rate=0.75,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001103"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.EVENT,
            name="Rohan's first day at school",
            relationship=None,
            description="Walking your grandson to school",
            story=(
                "Rohan would not let go of your hand at the gate. You told "
                "him the teacher was your friend, and he believed you. He "
                "still tells that story."
            ),
            photo_uri="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400",
            media_type=MediaType.PHOTO,
            memory_date=date(2009, 1, 5),
            people=["Rohan"],
            tags=["family", "school"],
            sort_order=2,
            times_shown=3,
            remembered_count=2,
            success_rate=0.67,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001104"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.MOMENT,
            name="Priya's wedding song",
            relationship=None,
            description="Video from the wedding",
            story=(
                "The whole family sang together at Priya's wedding. You led "
                "the first line, the way your mother used to."
            ),
            photo_uri="https://images.unsplash.com/photo-1519741497674-611481863552?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1519741497674-611481863552?w=400",
            media_uri=(
                "https://res.cloudinary.com/demo/video/upload/"
                "v1611764980/samples/elephants.mp4"
            ),
            media_type=MediaType.VIDEO,
            media_bytes=3_600_000,
            memory_date=date(2005, 2, 11),
            people=["Priya"],
            tags=["wedding", "music", "family"],
            is_favourite=True,
            sort_order=3,
            times_shown=2,
            remembered_count=2,
            success_rate=0.9,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001105"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.MOMENT,
            name="A message from Priya",
            relationship=None,
            description="Voice note recorded by your daughter",
            story="Priya recorded this for you last Sunday.",
            photo_uri=None,
            media_uri=(
                "https://res.cloudinary.com/demo/video/upload/"
                "v1612275877/samples/audio/bgm-01.mp3"
            ),
            media_type=MediaType.AUDIO,
            media_bytes=1_100_000,
            memory_date=None,
            people=["Priya"],
            tags=["voice note", "family"],
            sort_order=4,
            times_shown=1,
            remembered_count=1,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001106"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.MOMENT,
            name="Your recipe for pitha",
            relationship=None,
            description="Written down by Priya so it is not lost",
            story=(
                "Soak the rice overnight. Grind it fine. Roast the sesame "
                "with jaggery until it smells sweet. You never measured "
                "anything, and it was always right."
            ),
            photo_uri=None,
            media_type=MediaType.NOTE,
            memory_date=None,
            people=["Priya"],
            tags=["recipe", "food"],
            sort_order=5,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001107"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.PLACE,
            name="The river by the village",
            relationship=None,
            description="Where the boats came in every evening",
            story=(
                "You washed the rice at the ghat while the fishermen tied up "
                "their boats. Rohan learned to swim here, holding on to the "
                "side of your uncle's boat."
            ),
            photo_uri="https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=400",
            media_type=MediaType.PHOTO,
            memory_date=date(1992, 10, 3),
            people=["Rohan"],
            tags=["river", "village", "boats"],
            sort_order=6,
            times_shown=2,
            remembered_count=2,
            success_rate=0.8,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001108"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.MOMENT,
            name="Rohan playing in the grove",
            relationship=None,
            description="Video from last summer",
            story=(
                "The children played under the sal trees until it was too "
                "dark to see the ball. You sat on the verandah and kept the "
                "score, and nobody argued with your count."
            ),
            photo_uri="https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400",
            media_uri=(
                "https://res.cloudinary.com/demo/video/upload/"
                "samples/cld-sample-video.mp4"
            ),
            media_type=MediaType.VIDEO,
            media_bytes=2_900_000,
            memory_date=date(2024, 6, 15),
            people=["Rohan"],
            tags=["family", "play", "summer"],
            sort_order=7,
            times_shown=1,
            remembered_count=1,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001109"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.PLACE,
            name="Sunrise over the paddy fields",
            relationship=None,
            description="The fields behind the old house",
            story=(
                "The first thing you saw every morning. Your father planted "
                "these fields, and you carried his tea out to him before "
                "school."
            ),
            photo_uri="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400",
            media_type=MediaType.PHOTO,
            memory_date=date(1970, 11, 20),
            people=[],
            tags=["fields", "morning", "home"],
            sort_order=8,
            times_shown=3,
            remembered_count=3,
            success_rate=1.0,
        ),

        MyWorldItem(
            id=uuid.UUID("00000000-0000-4000-8000-000000001110"),
            patient_id=PATIENT_1_ID,
            category=MyWorldCategory.MOMENT,
            name="Sunday at the market",
            relationship=None,
            description="Priya's photo from the vegetable market",
            story=(
                "You always went to the same three stalls and haggled with "
                "all of them, even though they gave you the right price "
                "before you opened your mouth."
            ),
            photo_uri="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200",
            thumbnail_uri="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400",
            media_type=MediaType.PHOTO,
            memory_date=date(2023, 3, 12),
            people=["Priya"],
            tags=["market", "food"],
            sort_order=9,
            times_shown=1,
            remembered_count=1,
        ),
    ]

    existing_ids = {
        row[0]
        for row in db.query(MyWorldItem.id).filter(
            MyWorldItem.id.in_([item.id for item in my_world_items])
        )
    }

    new_items = [item for item in my_world_items if item.id not in existing_ids]

    if new_items:
        db.add_all(new_items)

    # Earlier seeds pointed the first entries at /demo/*.jpg, which nothing
    # serves, so existing databases show blank tiles. Repair only those
    # placeholders — a caregiver's own uploads are never overwritten.
    seeded_by_id = {item.id: item for item in my_world_items}
    for row in db.query(MyWorldItem).filter(MyWorldItem.id.in_(existing_ids)):
        # Placeholders and the one stock photo that turned out to be the
        # wrong subject (Tower Bridge standing in for Bihu).
        replaceable = ("/demo/", "https://images.unsplash.com/photo-1533929736458")
        if row.photo_uri and not row.photo_uri.startswith(replaceable):
            continue
        seeded = seeded_by_id[row.id]
        if not seeded.photo_uri:
            continue
        row.photo_uri = seeded.photo_uri
        row.thumbnail_uri = seeded.thumbnail_uri
        row.media_uri = seeded.media_uri
        row.media_type = seeded.media_type
        row.media_bytes = seeded.media_bytes

    db.commit()


def main() -> None:
    from app.database import SessionLocal

    db = SessionLocal()

    try:
        seed_database(db)
        print("Seed data applied.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
