#!/usr/bin/env bash
# Trigger a Render deploy for the SaintAugustineAI backend.
# Render API key read from backend/.render_token (rnd_...).
set -e
TOKEN=$(grep -o 'rnd_[A-Za-z0-9_-]*' /c/Users/tyler.simons/projects/saint-augustine-ai/backend/.render_token 2>/dev/null | head -1)
if [ -z "$TOKEN" ]; then echo "NO TOKEN"; exit 1; fi
SID="srv-crqc8vbipnss73f4cbng"
echo "Triggering deploy for $SID ..."
curl -s -m 40 -X POST "https://api.render.com/v1/services/$SID/deploys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP:%{http_code}\n"
