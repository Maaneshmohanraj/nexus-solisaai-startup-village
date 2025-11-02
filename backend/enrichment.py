import os, asyncio
from datetime import datetime
from typing import Dict
from dotenv import load_dotenv

load_dotenv()
USE_MOCK = os.getenv("USE_MOCK_ENRICHMENT", "true").lower() == "true"

class EnrichmentService:
    def __init__(self):
        print(f"🔧 Enrichment mode: {'MOCK' if USE_MOCK else 'REAL APIS'}")

    async def enrich_lead(self, name: str, email: str, phone: str) -> Dict:
        if USE_MOCK:
            return await self._mock_enrichment(name, email, phone)
        # Real mode placeholder (we’ll wire Clay later)
        return await self._mock_enrichment(name, email, phone)

    async def _mock_enrichment(self, name: str, email: str, phone: str) -> Dict:
        await asyncio.sleep(0.4)
        domain = email.split('@')[1] if '@' in email else "unknown.com"
        company_name = domain.split('.')[0].title()
        return {
            "company": f"{company_name} Inc.",
            "job_title": self._pick(["Software Engineer","Product Manager","Marketing Director","VP Sales","CTO","CEO","Ops Manager","Data Analyst"]),
            "location": self._pick(["San Francisco, CA","New York, NY","Austin, TX","Seattle, WA","Boston, MA","Los Angeles, CA","Chicago, IL"]),
            "linkedin_url": f"https://linkedin.com/in/{name.lower().replace(' ', '-')}",
            "company_size": self._pick(["1-10 employees","11-50 employees","50-200 employees","200-500 employees","500-1000 employees"]),
            "industry": self._infer_industry(domain),
            "enriched": "success",
            "enriched_at": datetime.utcnow(),
        }

    def _pick(self, items):
        import random
        return random.choice(items)

    def _infer_industry(self, domain: str) -> str:
        d = domain.lower()
        if any(k in d for k in ["tech","software","ai","cloud"]): return "Technology"
        if any(k in d for k in ["bank","fin","pay","card"]): return "Finance"
        if any(k in d for k in ["health","med","care","bio"]): return "Healthcare"
        return "Business Services"

enrichment_service = EnrichmentService()
