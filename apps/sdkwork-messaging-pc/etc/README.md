# Browser Runtime Configuration

`etc/browser/` owns tracked, non-secret runtime profiles for the Messaging PC deployable root. `scripts/materialize-runtime-env.mjs` selects one typed profile and writes `public/runtime-env.json`; `agent.app.config.json` remains application identity metadata.

All standalone profiles use same-origin SDK roots. Cloud profiles use explicit app-api and appbase app-api origins. Tokens never belong in these files.

