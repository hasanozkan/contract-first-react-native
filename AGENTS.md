# Instructions for coding agents

- **Wire types are generated, never written.** `src/api/*.gen.ts` come from the
  services' published contracts (`npm run contracts`). If a service changed,
  regenerate and adapt the app; `npm run contracts:check` fails otherwise.
- **Mocks must `satisfies` the generated schema types.** A mock that drifts does not compile.
- **Every change goes through `ConfirmCard`** — the person confirms, whether they
  asked for the change or the assistant proposed it.
- Expo moves fast: check the SDK 57 docs before touching an Expo API.
  Expo's global `fetch` rejects `Request` bodies — see `expoFetch` in `src/api/clients.ts`.
- Run `npm run check` before you say you are done; `npm run test:live` against
  running services when the API layer changes.
