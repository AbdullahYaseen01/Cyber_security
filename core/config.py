"""VDP / SaaS platform configuration."""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Vercel serverless: only /tmp is writable
if os.environ.get("VERCEL"):
    DATA_DIR = Path("/tmp/quantumshield/data")
else:
    DATA_DIR = ROOT / "data"
SOURCES_DIR = DATA_DIR / "sources"
REPORTS_DIR = DATA_DIR / "reports"
HISTORY_DIR = DATA_DIR / "history"

# Preset scopes (NASA VDP) — universal mode accepts any domain
SCOPE_DOMAINS = [
    "nasa.gov",
    "usgeo.gov",
    "globe.gov",
    "nspires.nasaprs.com",
    "nsc.nasa.gov",
]

PRIMARY_URLS = {
    "nasa.gov": ["https://www.nasa.gov", "https://nasa.gov"],
    "usgeo.gov": ["https://www.usgeo.gov", "https://usgeo.gov"],
    "globe.gov": ["https://www.globe.gov", "https://dataentry.globe.gov", "https://vis.globe.gov"],
    "nspires.nasaprs.com": ["https://nspires.nasaprs.com"],
    "nsc.nasa.gov": ["https://nsc.nasa.gov", "https://www.nsc.nasa.gov"],
}

# SaaS: allow scanning any public domain (authorization is operator responsibility)
UNIVERSAL_MODE = True

FORBIDDEN_PATHS = {"/wp-json/wp/v2/users", "/xmlrpc.php"}

REQUEST_DELAY = 0.15
CRAWL_MAX_PAGES_PER_DOMAIN = 40
CRAWL_MAX_DEPTH = 2
SUBDOMAIN_MAX = 30
HTTP_TIMEOUT = 8.0

USER_AGENT = "QuantumShield/7.1 (Authorized Security Research)"

# Mega parallel engine — continuous workers (not batch-gather)
MEGA_CHECK_TARGET = 1_000_000
MEGA_CONCURRENCY = 150
MEGA_REQUEST_DELAY = 0
MEGA_BATCH_SIZE = 200
MEGA_HTTP_TIMEOUT = 2.5
MEGA_CONNECT_TIMEOUT = 1.5
MEGA_PREFETCH_BATCHES = 8
MEGA_PROGRESS_INTERVAL = 0.35  # seconds between UI progress pushes
MEGA_QUEUE_SIZE = 2000

VERIFIED_MIN_CONFIDENCE = 90

# Product branding
PRODUCT_NAME = "QuantumShield"
PRODUCT_VERSION = "7.1.0"
