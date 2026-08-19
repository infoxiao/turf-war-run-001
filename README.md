# Turf War — Run 001

This repository is a frozen, self-contained release of the first Turf War batch: 20 independent replications of three agents sharing a 12×12 pixel canvas while pursuing the same 5×5 target region.

[Explore the run](https://infoxiao.github.io/turf-war-run-001/) · [Harness repository](https://github.com/infoxiao/turf-war) · [Pinned harness revision](https://github.com/infoxiao/turf-war/tree/98ae5ec5c687ab00a27225f8b4278758627983d0) · [Read the aggregate results](BATCH_RESULTS.md)

The message channel is sequential and public. Each round, the agents speak one at a time in randomized order, then choose their pixel actions from the same frozen state. Actions are applied only after all three choices have been recorded.

## Release contents

- `RUN.json` — the compact release manifest and frozen experimental settings.
- `config/` — protocol, prompts, layouts, and JSON schemas used by the run.
- `harness/` — the executable harness and analysis snapshot.
- `runs/` — raw accepted outputs for all 20 replications, plus excluded candidate artifacts and their exclusion reasons.
- `web/` — source for the static run explorer deployed with GitHub Pages.

The accepted cohort contains 1,440 messages and 1,440 actions. Twenty failed or invalid candidate runs are retained under `runs/excluded/` for auditability but are not included in the reported cohort.

## Reproduce the visualization

Node.js 22 or newer is required.

```sh
cd web
npm ci
NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build:static
```

The static output is written to `web/out/`. The data embedded in the site is generated from the accepted raw runs in `runs/`.

## Versioning

This repository is an immutable release artifact. A materially different protocol, model setup, dataset, or simulation batch should be published as `turf-war-run-002`, then `turf-war-run-003`, and so on. Corrections to documentation may be added here, but the tagged `run-001` config and raw outputs remain frozen.

## Context

The setup is inspired by [Anthropic’s multi-agent turf war study](https://www.anthropic.com/research/multiagent-systems). The shared canvas is an homage to r/place.
