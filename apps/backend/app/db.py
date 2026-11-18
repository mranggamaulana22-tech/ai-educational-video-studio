from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from . import config


class Base(DeclarativeBase):
    pass


def make_engine(url=None):
    url = url or config.DATABASE_URL
    if not url:
        raise SystemExit(
            "DATABASE_URL belum diisi. Tambahkan baris di file .env, contoh:\n"
            "DATABASE_URL=postgresql+psycopg://postgres:PASSWORD_KAMU@localhost:5432/video_studio"
        )
    kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {"pool_pre_ping": True}
    return create_engine(url, **kwargs)


engine = None
SessionLocal = None


def init(url=None):
    """Siapkan koneksi dan buat tabel bila belum ada."""
    global engine, SessionLocal
    from . import models  # noqa: F401  (mendaftarkan tabel)

    engine = make_engine(url)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    return engine


def get_session():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
