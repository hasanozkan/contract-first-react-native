# Library mobile — a contract-first Expo client

[![ci](https://github.com/hasanozkan/library-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/hasanozkan/library-mobile/actions/workflows/ci.yml)
![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![license](https://img.shields.io/badge/license-MIT-green)

A React Native (Expo) app for the library services in this set: search the
catalog and borrow a copy, or ask the AI assistant — and **confirm every
change on the same card**, whether you asked for it or the assistant proposed it.

It exists to show three things a mobile client in a multi-service system
needs, and how to make each one fail loudly:

| | How | Fails when |
|---|---|---|
| **Types from contracts** | `src/api/*.gen.ts` are generated from the services' committed OpenAPI documents; calls go through typed [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) clients | a service changes its contract and the app has not followed (`npm run contracts:check`) · the app calls a path or field that does not exist (`tsc`) |
| **Mock-first, but honest mocks** | Without a service URL the app runs on in-memory mocks; every mock response `satisfies` the generated schema type | a mock drifts from the real API (`tsc`) |
| **The same client against real services** | `npm run test:live` drives the generated clients against running services; CI starts them from their own repositories | the wiring works on mocks but not on the wire |
| **Human approval in the UI** | One `ConfirmCard` for all changes; an assistant proposal the user never asked for arrives `suspicious` and shows the service's reasons | a change could run without a tap (screen tests) |

The live test earned its place on day one: Expo SDK 57's global `fetch`
rejects the `Request` objects openapi-fetch sends ("Unsupported BodyInit
type"). The mock-backed screen tests could not see it — the mocks read the
`Request` themselves. The app now bridges it (`expoFetch` in
[`src/api/clients.ts`](src/api/clients.ts)).

## The services

| Tab | Talks to | Contract |
|---|---|---|
| Catalog | the library API — [Python](https://github.com/hasanozkan/spec-driven-ddd-python) or [.NET](https://github.com/hasanozkan/spec-driven-ddd-dotnet); one spec, one contract | `contracts/openapi.json` in either |
| Assistant | the [tool-calling assistant](https://github.com/hasanozkan/llm-tool-calling-assistant)'s HTTP API | `contracts/openapi.json` there |

Borrowing from the catalog needs a copy id; the library API gained
`GET /catalog/books/{isbn}/copies` for this app — **spec first**
([feature 003, rule CAT-R3](https://github.com/hasanozkan/spec-driven-ddd-python/tree/main/specs/features/003-list-copies)),
then both implementations, then the regenerated types here.

## Run it

```sh
npm install
npm start                      # mock mode: no services needed

# live mode
EXPO_PUBLIC_LIBRARY_URL=http://localhost:8000 \
EXPO_PUBLIC_ASSISTANT_URL=http://localhost:8001 npm start

npm run check                  # lint, strict tsc, screen tests, contract gate
npm run test:live              # generated clients against running services (env as above)
```

## Layout

| Path | |
|---|---|
| [`src/api/`](src/api) | Generated types, typed clients, contract-checked mocks |
| [`src/ui/ConfirmCard.tsx`](src/ui/ConfirmCard.tsx) | The one approval surface |
| [`src/features/catalog/`](src/features/catalog) | Search → copies → borrow |
| [`src/features/assistant/`](src/features/assistant) | Conversation with proposals as cards |
| [`src/__tests__/`](src/__tests__) | Screen flows on mocks; `live.test.ts` against real services |
| [`scripts/contracts.sh`](scripts/contracts.sh) | Generate / check types from both published contracts |

---

Part of a set: [llm-tool-calling-assistant](https://github.com/hasanozkan/llm-tool-calling-assistant)
· [spec-driven-ddd-python](https://github.com/hasanozkan/spec-driven-ddd-python)
· [spec-driven-ddd-dotnet](https://github.com/hasanozkan/spec-driven-ddd-dotnet)
· [gitops-reference](https://github.com/hasanozkan/gitops-reference)
· [ai-native-engineering](https://github.com/hasanozkan/ai-native-engineering).
By [Hasan Özkan](https://github.com/hasanozkan) · [LinkedIn](https://www.linkedin.com/in/hasanozkan/)
