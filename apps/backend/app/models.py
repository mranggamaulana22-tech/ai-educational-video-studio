from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now():
    return datetime.now(timezone.utc)


class Series(Base):
    __tablename__ = "series"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    course: Mapped[str] = mapped_column(String(200), default="")
    total_days: Mapped[int] = mapped_column(Integer, default=15)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Video(Base):
    __tablename__ = "videos"
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int | None] = mapped_column(ForeignKey("series.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)  # dipakai sebagai nama file (slug)
    title: Mapped[str] = mapped_column(String(300), default="")
    day: Mapped[int] = mapped_column(Integer, default=1)
    next_topic: Mapped[str] = mapped_column(String(300), default="")
    voice: Mapped[str] = mapped_column(String(60), default="Kore")  # pilihan narator
    provider: Mapped[str] = mapped_column(String(30), default="gemini")
    model: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    series: Mapped["Series | None"] = relationship()


class Artifact(Base):
    """Satu versi hasil sebuah tahap (catatan, naskah, suara, ...). Versi lama tidak pernah dihapus."""

    __tablename__ = "artifacts"
    __table_args__ = (UniqueConstraint("video_id", "stage", "version"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id"), index=True)
    stage: Mapped[str] = mapped_column(String(20), index=True)
    version: Mapped[int] = mapped_column(Integer)
    path: Mapped[str] = mapped_column(Text)  # salinan di folder storage
    source: Mapped[str] = mapped_column(String(20), default="auto")  # auto | manual | imported
    status: Mapped[str] = mapped_column(String(10), default="draft")  # draft | approved | stale
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Run(Base):
    """Catatan satu kali menjalankan tahap (termasuk log), berhasil atau gagal."""

    __tablename__ = "runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id"), index=True)
    stage: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(10), default="queued")  # queued | running | ok | failed
    log: Mapped[str] = mapped_column(Text, default="")
    artifact_id: Mapped[int | None] = mapped_column(ForeignKey("artifacts.id"), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
