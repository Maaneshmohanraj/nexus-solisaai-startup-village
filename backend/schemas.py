from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_serializer

# ---------- Request models ----------

class LeadCreate(BaseModel):
    name: str
    email: str
    phone: str

# ---------- Response models ----------

class LeadResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    status: str
    created_at: datetime                      # <- datetime, not str
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None
    enriched: Optional[str] = None
    enriched_at: Optional[datetime] = None     # <- datetime, not str

    # Let Pydantic read SQLAlchemy model attributes directly.
    model_config = ConfigDict(from_attributes=True)

    # Serialize datetimes as ISO 8601 strings in JSON.
    @field_serializer("created_at", "enriched_at")
    def _serialize_dt(self, v: Optional[datetime], _info):
        return v.isoformat() if v else None
