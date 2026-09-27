import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.seed import seed_database

# Overridable so the suite can point at a throwaway database: it drops and
# recreates every table, which must never happen to a development database.
# The default targets a separate "coco_test" database on the compose Postgres
# (host port 5433); the dev database "coco" lives on the same server.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://coco:coco_dev_password@localhost:5433/coco_test",
)

# Refuse to drop tables in a database that Alembic manages. The dev database
# carries an alembic_version table; the throwaway test database never does.
_MIGRATED_DB_MESSAGE = (
    "TEST_DATABASE_URL points at an Alembic-managed database ({url}). "
    "The test suite drops every table, so point TEST_DATABASE_URL at a "
    "throwaway database (for example .../coco_test) instead."
)


@pytest.fixture(scope="session")
def engine():
    try:
        test_engine = create_engine(TEST_DATABASE_URL)
        test_engine.connect().close()
    except Exception as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    with test_engine.connect() as conn:
        if inspect(conn).has_table("alembic_version"):
            pytest.exit(_MIGRATED_DB_MESSAGE.format(url=TEST_DATABASE_URL), returncode=1)

    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield test_engine
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    seed_database(session)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
