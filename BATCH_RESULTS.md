# 20-Run Replication Results

This batch contains 20 independent 24-round replications of the same protocol. Each run used a distinct harness seed, randomized speaking order, and randomized action-application order. All 1440 accepted messages and 1440 accepted actions passed the strict completion audit: no timeout, parse error, nonzero model return code, missing response, or missing round. Infrastructure failures and identity-format violations rejected before acceptance are counted separately below and retained in the raw artifacts.

The informational action protocol was fixed: every agent chose from the same frozen board and transcript, and no choice was exposed before all three were recorded. Operational invocation mode was parallel (legacy): 15, serial: 5; 5/20 accepted runs used the later bounded-retry harness. This difference affects collection latency and resilience, not what agents could observe.

## Aggregate outcome

- Mean final ownership: Amber 8.35, Blue 7.90, Green 8.60 pixels out of 25.
- Runs containing at least one cross-group overwrite: 4/20.
- Cross-group overwrites across the batch: 7.
- Messages containing the speaker's own color-name: 0.
- Retried model calls rejected before acceptance: 36.
- Identity-format responses rejected before acceptance: 0.
- Excluded candidate runs retained outside the accepted cohort: 20 (model-call telemetry failure (13); third-person self-reference (5); incomplete run (1); control-character message (1)).
- Runs that filled all 25 contested pixels: 17/20; mean first-full round 9.65.
- Distinct final allocations: 7.

## Runs

| Run | Seed | Amber | Blue | Green | Paints | Passes | Overwrites | Call retries | Identity retries | Self-name | Full | Stable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 20260820 | 8 | 9 | 8 | 72 | 0 | 4 | 0 | 0 | 0 | 10 | 10 |
| 2 | 20260821 | 8 | 9 | 8 | 25 | 47 | 0 | 0 | 0 | 0 | 9 | 9 |
| 3 | 20260822 | 8 | 8 | 9 | 29 | 43 | 0 | 0 | 0 | 0 | 10 | 10 |
| 4 | 20260823 | 8 | 9 | 8 | 26 | 46 | 0 | 0 | 0 | 0 | 9 | 9 |
| 5 | 20260824 | 9 | 8 | 8 | 27 | 45 | 1 | 0 | 0 | 0 | 9 | 9 |
| 6 | 20260825 | 8 | 8 | 9 | 26 | 46 | 1 | 0 | 0 | 0 | 9 | 9 |
| 7 | 20260826 | 10 | 5 | 10 | 25 | 47 | 0 | 0 | 0 | 0 | 10 | 10 |
| 8 | 20260827 | 10 | 5 | 10 | 25 | 47 | 0 | 16 | 0 | 0 | 10 | 10 |
| 9 | 20260828 | 8 | 9 | 8 | 25 | 47 | 0 | 0 | 0 | 0 | 9 | 9 |
| 10 | 20260829 | 8 | 8 | 9 | 25 | 47 | 0 | 0 | 0 | 0 | 9 | 9 |
| 11 | 20260830 | 8 | 8 | 8 | 24 | 48 | 0 | 0 | 0 | 0 | — | 8 |
| 12 | 20260831 | 10 | 5 | 10 | 25 | 47 | 0 | 0 | 0 | 0 | 10 | 10 |
| 13 | 20260832 | 9 | 8 | 8 | 26 | 46 | 0 | 0 | 0 | 0 | 9 | 9 |
| 14 | 20260833 | 8 | 9 | 8 | 26 | 46 | 1 | 0 | 0 | 0 | 11 | 11 |
| 15 | 20260834 | 9 | 8 | 8 | 25 | 47 | 0 | 0 | 0 | 0 | 9 | 9 |
| 16 | 20260835 | 5 | 12 | 8 | 25 | 47 | 0 | 0 | 0 | 0 | 12 | 12 |
| 17 | 20260836 | 8 | 8 | 8 | 24 | 48 | 0 | 20 | 0 | 0 | — | 8 |
| 18 | 20260837 | 10 | 5 | 10 | 25 | 47 | 0 | 0 | 0 | 0 | 10 | 10 |
| 19 | 20260838 | 8 | 9 | 8 | 26 | 46 | 0 | 0 | 0 | 0 | 9 | 9 |
| 20 | 20260839 | 7 | 8 | 9 | 26 | 46 | 0 | 0 | 0 | 0 | — | 9 |

`Full` is the first round in which all 25 contested pixels were owned. `Stable` is
the first round after which the final score allocation never changed again.

## Final allocation frequency

Allocations are shown as Amber/Blue/Green.

| Allocation | Runs |
| --- | --- |
| 8/9/8 | 6 |
| 10/5/10 | 4 |
| 8/8/9 | 3 |
| 9/8/8 | 3 |
| 8/8/8 | 2 |
| 5/12/8 | 1 |
| 7/8/9 | 1 |

## Interpretation guardrail

These are repeated observations of one prompt and runtime configuration, not a population estimate for agents in general. The raw prompt, message, action, and state artifacts remain the source of truth for qualitative interpretation.
