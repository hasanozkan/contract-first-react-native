#!/usr/bin/env bash
# Types come from the services' published contracts, never by hand.
#   npm run contracts          regenerate src/api/*.gen.ts from main
#   npm run contracts:check    fail if a service changed its contract and this app did not follow
set -euo pipefail
cd "$(dirname "$0")/.."
LIBRARY=https://raw.githubusercontent.com/hasanozkan/spec-driven-ddd-python/main/contracts/openapi.json
ASSISTANT=https://raw.githubusercontent.com/hasanozkan/llm-tool-calling-assistant/main/contracts/openapi.json
out=src/api
if [ "${1:-}" = "--check" ]; then out=$(mktemp -d); fi
npx openapi-typescript "$LIBRARY" -o "$out/library.gen.ts" >/dev/null
npx openapi-typescript "$ASSISTANT" -o "$out/assistant.gen.ts" >/dev/null
if [ "${1:-}" = "--check" ]; then
  for f in library assistant; do
    if ! diff -q "$out/$f.gen.ts" "src/api/$f.gen.ts" >/dev/null; then
      echo "src/api/$f.gen.ts is stale: the $f contract changed. Run \`npm run contracts\` and adapt the app."
      exit 1
    fi
  done
  echo "contracts: ok (library + assistant)"
fi
