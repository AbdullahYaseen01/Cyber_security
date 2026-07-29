"""Platform API routes — domain verification, subscription gates."""

from __future__ import annotations

import dns.resolver
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/platform", tags=["platform"])


class DomainVerifyRequest(BaseModel):
    domain: str
    token: str


class DomainVerifyResponse(BaseModel):
    domain: str
    verified: bool
    method: str
    record_name: str
    expected_value: str
    message: str


@router.post("/domains/verify", response_model=DomainVerifyResponse)
async def verify_domain(req: DomainVerifyRequest):
    """Check DNS TXT record for domain ownership verification."""
    domain = req.domain.strip().lower().removeprefix("https://").removeprefix("http://").split("/")[0]
    record_name = f"_quantumshield-verify.{domain}"
    expected = f"quantumshield-verify={req.token}"

    try:
        answers = dns.resolver.resolve(record_name, "TXT")
        found = any(expected in str(r).strip('"') for r in answers)
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, Exception):
        found = False

    return DomainVerifyResponse(
        domain=domain,
        verified=found,
        method="dns_txt",
        record_name=record_name,
        expected_value=expected,
        message="Domain verified successfully" if found else "TXT record not found. Add the record and try again.",
    )


@router.get("/health")
async def platform_health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "quantumshield-platform",
    }


@router.get("/subscription/tiers")
async def subscription_tiers():
    return {
        "tiers": [
            {"id": "STARTER", "price_monthly": 1, "price_annual": 10, "domains": 1, "scans": 10},
            {"id": "PROFESSIONAL", "price_monthly": 29, "price_annual": 278, "domains": 5, "scans": 100},
            {"id": "BUSINESS", "price_monthly": 99, "price_annual": 950, "domains": 25, "scans": 500},
            {"id": "ENTERPRISE", "price_monthly": 299, "price_annual": 2870, "domains": "unlimited", "scans": "unlimited"},
        ],
        "no_free_tier": True,
        "trial_days": 7,
    }
