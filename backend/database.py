# backend/database.py
import os
from datetime import datetime
from typing import Generator, Optional

from dotenv import load_dotenv
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

# Load env (DATABASE_URL, etc.)
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./aegis.db",  # fallback for local dev if Postgres not set
)

# Engine + Session
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --------------------------
# Models
# --------------------------
class Lead(Base):
    __tablename__ = "leads"

    # Basic info
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=False, index=True)
    status = Column(String, default="new")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Enriched data
    company = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    location = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    enriched = Column(String, default="pending")  # pending, success, failed
    enriched_at = Column(DateTime, nullable=True)

    # Relationships
    messages = relationship("Message", back_populates="lead", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "company": self.company,
            "job_title": self.job_title,
            "location": self.location,
            "linkedin_url": self.linkedin_url,
            "company_size": self.company_size,
            "industry": self.industry,
            "enriched": self.enriched,
            "enriched_at": self.enriched_at.isoformat() if self.enriched_at else None,
        }


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False)
    direction = Column(String, nullable=False)  # "outbound" | "inbound"
    channel = Column(String, nullable=False)    # "sms" | "email"
    subject = Column(String, nullable=True)     # emails only
    body = Column(Text, nullable=False)
    provider_sid = Column(String, nullable=True)  # external id if any
    status = Column(String, default="queued")     # queued | sent | delivered | received | failed
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="messages")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lead_id": self.lead_id,
            "direction": self.direction,
            "channel": self.channel,
            "subject": self.subject,
            "body": self.body,
            "provider_sid": self.provider_sid,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# --------------------------
# Session helpers
# --------------------------
def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
