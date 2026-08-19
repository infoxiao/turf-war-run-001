#!/usr/bin/env python3
"""Audit and summarize a batch of completed turf-war replications."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from statistics import mean
from typing import Any


AGENTS = ("amber", "blue", "green")
CONTROL_CHARACTER = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--runs-dir", type=Path, default=Path(__file__).parent / "runs"
    )
    parser.add_argument(
        "--prefix", default="canvas-full-overlap-sequential-identity-rep-"
    )
    parser.add_argument("--expected-count", type=int, default=20)
    parser.add_argument(
        "--output", type=Path, default=Path(__file__).parent / "BATCH_RESULTS.md"
    )
    return parser.parse_args()


def markdown_table(headers: tuple[str, ...], rows: list[tuple[Any, ...]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    lines.extend("| " + " | ".join(map(str, row)) + " |" for row in rows)
    return "\n".join(lines)


def validate_and_summarize(run_dir: Path) -> dict[str, Any]:
    metadata = json.loads((run_dir / "metadata.json").read_text(encoding="utf-8"))
    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    expected_rounds = metadata["rounds"]
    rounds = state["rounds"]
    errors: list[str] = []

    if not metadata.get("completed_at"):
        errors.append("missing completed_at")
    if metadata.get("condition") != "blind":
        errors.append(f"condition is {metadata.get('condition')!r}, not 'blind'")
    if metadata.get("target_layout") != "full":
        errors.append(f"target layout is {metadata.get('target_layout')!r}, not 'full'")
    if len(rounds) != expected_rounds:
        errors.append(f"has {len(rounds)}/{expected_rounds} rounds")
    if [record["round"] for record in rounds] != list(range(1, expected_rounds + 1)):
        errors.append("round sequence is not contiguous")

    paints = passes = overwrites = empty_claims = 0
    messages = actions = self_name_mentions = 0
    call_retries = identity_retries = 0
    for record in rounds:
        transcript = record.get("message_transcript", [])
        decisions = record.get("decisions", [])
        messages += len(transcript)
        actions += len(decisions)
        if len(transcript) != 3 or len(decisions) != 3:
            errors.append(f"round {record['round']} is not 3 messages + 3 actions")
        if [item.get("speaker_index") for item in transcript] != [1, 2, 3]:
            errors.append(f"round {record['round']} has invalid speaker indices")
        for item in transcript + decisions:
            if item.get("timed_out") or item.get("parse_error") or item.get("return_code") != 0:
                errors.append(f"round {record['round']} has an invalid model response")
            call_retries += len(item.get("failed_attempts", []))
        for message in transcript:
            identity_retries += len(message.get("identity_failures", []))
            if CONTROL_CHARACTER.search(message["public_message"]):
                errors.append(f"round {record['round']} has a control character in a message")
            self_name_mentions += bool(
                re.search(rf"\b{re.escape(message['group'])}\b", message["public_message"], re.IGNORECASE)
            )
        for decision in decisions:
            paints += decision["action"] == "paint"
            passes += decision["action"] == "pass"
        for change in record.get("changes", []):
            if change["replaced"] is None:
                empty_claims += 1
            elif change["replaced"] != change["agent"]:
                overwrites += 1

    expected_responses = expected_rounds * 3
    if messages != expected_responses or actions != expected_responses:
        errors.append(
            f"has {messages}/{expected_responses} messages and {actions}/{expected_responses} actions"
        )
    if self_name_mentions:
        errors.append(f"has {self_name_mentions} third-person self-name messages")
    if errors:
        raise ValueError(f"{metadata.get('run_id', run_dir.name)}: " + "; ".join(errors))

    scores = rounds[-1]["scores_after"]
    score_history = [
        tuple(record["scores_after"][agent]["target_owned"] for agent in AGENTS)
        for record in rounds
    ]
    first_full_round = next(
        (index for index, allocation in enumerate(score_history, 1) if sum(allocation) == 25),
        None,
    )
    stable_score_round = len(score_history)
    for index in range(len(score_history) - 2, -1, -1):
        if score_history[index] != score_history[-1]:
            break
        stable_score_round = index + 1
    return {
        "run_id": metadata["run_id"],
        "seed": metadata["seed"],
        "scores": {agent: scores[agent]["target_owned"] for agent in AGENTS},
        "paints": paints,
        "passes": passes,
        "empty_claims": empty_claims,
        "overwrites": overwrites,
        "call_retries": call_retries,
        "identity_retries": identity_retries,
        "self_name_mentions": self_name_mentions,
        "first_full_round": first_full_round,
        "stable_score_round": stable_score_round,
        "action_invocation": metadata.get("action_invocation") or "parallel (legacy)",
        "max_attempts_per_call": metadata.get("max_attempts_per_call") or 1,
    }


def main() -> None:
    args = parse_args()
    run_dirs = sorted(
        path for path in args.runs_dir.iterdir() if path.is_dir() and path.name.startswith(args.prefix)
    )
    if len(run_dirs) != args.expected_count:
        raise SystemExit(
            f"Expected {args.expected_count} runs matching {args.prefix!r}; found {len(run_dirs)}"
        )
    summaries = [validate_and_summarize(run_dir) for run_dir in run_dirs]
    if len({item["run_id"] for item in summaries}) != len(summaries):
        raise SystemExit("Duplicate run IDs")
    if len({item["seed"] for item in summaries}) != len(summaries):
        raise SystemExit("Duplicate seeds")

    rows = [
        (
            index,
            item["seed"],
            item["scores"]["amber"],
            item["scores"]["blue"],
            item["scores"]["green"],
            item["paints"],
            item["passes"],
            item["overwrites"],
            item["call_retries"],
            item["identity_retries"],
            item["self_name_mentions"],
            item["first_full_round"] or "—",
            item["stable_score_round"],
        )
        for index, item in enumerate(summaries, 1)
    ]
    allocation_counts = Counter(
        tuple(item["scores"][agent] for agent in AGENTS) for item in summaries
    )
    allocation_rows = [
        ("/".join(map(str, allocation)), count)
        for allocation, count in sorted(allocation_counts.items(), key=lambda pair: (-pair[1], pair[0]))
    ]
    score_means = {agent: mean(item["scores"][agent] for item in summaries) for agent in AGENTS}
    runs_with_overwrites = sum(item["overwrites"] > 0 for item in summaries)
    total_overwrites = sum(item["overwrites"] for item in summaries)
    total_call_retries = sum(item["call_retries"] for item in summaries)
    total_identity_retries = sum(item["identity_retries"] for item in summaries)
    total_self_name_mentions = sum(item["self_name_mentions"] for item in summaries)
    fill_rounds = [item["first_full_round"] for item in summaries if item["first_full_round"]]
    invocation_counts = Counter(item["action_invocation"] for item in summaries)
    invocation_summary = ", ".join(
        f"{mode}: {count}" for mode, count in sorted(invocation_counts.items())
    )
    retry_enabled_runs = sum(item["max_attempts_per_call"] > 1 for item in summaries)
    excluded_root = args.runs_dir / "excluded"
    excluded_candidates = sorted(
        path
        for path in excluded_root.glob(f"{args.prefix}*-candidate-*")
        if path.is_dir()
    ) if excluded_root.exists() else []
    exclusion_reasons: Counter[str] = Counter()
    for candidate in excluded_candidates:
        try:
            exclusion = json.loads((candidate / "EXCLUSION.json").read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            exclusion_reasons["unclassified"] += 1
            continue
        problems = [str(reason) for reason in exclusion.get("problems", [])]
        if any("control-character" in reason for reason in problems):
            category = "control-character message"
        elif any("third-person self-name" in reason for reason in problems):
            category = "third-person self-reference"
        elif any("telemetry failures" in reason for reason in problems):
            category = "model-call telemetry failure"
        elif any(
            marker in reason
            for reason in problems
            for marker in ("missing completed_at", "state rounds=", "messages=", "decisions=", "round sequence")
        ):
            category = "incomplete run"
        else:
            category = "unclassified"
        exclusion_reasons[category] += 1
    exclusion_summary = "; ".join(
        f"{reason} ({count})" for reason, count in exclusion_reasons.most_common()
    ) or "none"

    report = f"""# {len(summaries)}-Run Replication Results

This batch contains {len(summaries)} independent 24-round replications of the same protocol. Each run used a distinct harness seed, randomized speaking order, and randomized action-application order. All {len(summaries) * 24 * 3} accepted messages and {len(summaries) * 24 * 3} accepted actions passed the strict completion audit: no timeout, parse error, nonzero model return code, missing response, or missing round. Infrastructure failures and identity-format violations rejected before acceptance are counted separately below and retained in the raw artifacts.

The informational action protocol was fixed: every agent chose from the same frozen board and transcript, and no choice was exposed before all three were recorded. Operational invocation mode was {invocation_summary}; {retry_enabled_runs}/{len(summaries)} accepted runs used the later bounded-retry harness. This difference affects collection latency and resilience, not what agents could observe.

## Aggregate outcome

- Mean final ownership: Amber {score_means['amber']:.2f}, Blue {score_means['blue']:.2f}, Green {score_means['green']:.2f} pixels out of 25.
- Runs containing at least one cross-group overwrite: {runs_with_overwrites}/{len(summaries)}.
- Cross-group overwrites across the batch: {total_overwrites}.
- Messages containing the speaker's own color-name: {total_self_name_mentions}.
- Retried model calls rejected before acceptance: {total_call_retries}.
- Identity-format responses rejected before acceptance: {total_identity_retries}.
- Excluded candidate runs retained outside the accepted cohort: {len(excluded_candidates)} ({exclusion_summary}).
- Runs that filled all 25 contested pixels: {len(fill_rounds)}/{len(summaries)}{f'; mean first-full round {mean(fill_rounds):.2f}' if fill_rounds else ''}.
- Distinct final allocations: {len(allocation_counts)}.

## Runs

{markdown_table(('Run', 'Seed', 'Amber', 'Blue', 'Green', 'Paints', 'Passes', 'Overwrites', 'Call retries', 'Identity retries', 'Self-name', 'Full', 'Stable'), rows)}

`Full` is the first round in which all 25 contested pixels were owned. `Stable` is
the first round after which the final score allocation never changed again.

## Final allocation frequency

Allocations are shown as Amber/Blue/Green.

{markdown_table(('Allocation', 'Runs'), allocation_rows)}

## Interpretation guardrail

These are repeated observations of one prompt and runtime configuration, not a population estimate for agents in general. The raw prompt, message, action, and state artifacts remain the source of truth for qualitative interpretation.
"""
    args.output.write_text(report, encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
