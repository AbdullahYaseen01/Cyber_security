#!/bin/bash
cd "$(dirname "$0")"
mkdir -p data/sources data/reports
source venv/bin/activate 2>/dev/null || { python3 -m venv venv && source venv/bin/activate && pip install -q -r requirements.txt; }
echo "╔══════════════════════════════════════════════════╗"
echo "║  NASA VDP MEGA SCANNER v4                        ║"
echo "║  http://127.0.0.1:8080                           ║"
echo "║  Subdomains · Crawl · Source AI · Nuclei · Verify║"
echo "╚══════════════════════════════════════════════════╝"
exec uvicorn main:app --host 127.0.0.1 --port 8080
