import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(webRoot, "..");
const runsRoot = resolve(projectRoot, "runs");

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const prefix = option(
  "--prefix",
  "canvas-full-overlap-sequential-identity-rep-",
);
const expectedCount = Number(option("--expected-count", "20"));
const startSeed = Number(option("--start-seed", "20260820"));

async function buildRun(runName, runNumber) {
  const runDir = resolve(runsRoot, runName);
  const [metadata, state] = await Promise.all([
    readFile(resolve(runDir, "metadata.json"), "utf8").then(JSON.parse),
    readFile(resolve(runDir, "state.json"), "utf8").then(JSON.parse),
  ]);
  if (!metadata.completed_at || state.rounds.length !== metadata.rounds) {
    throw new Error(`${runName} is incomplete`);
  }
  if (metadata.condition !== "blind" || metadata.target_layout !== "full") {
    throw new Error(`${runName} does not use the blind, full-overlap condition`);
  }
  if (metadata.seed !== startSeed + runNumber - 1) {
    throw new Error(`${runName} has unexpected seed ${metadata.seed}`);
  }

  for (const round of state.rounds) {
    if (round.message_transcript.length !== 3 || round.decisions.length !== 3) {
      throw new Error(`${runName} round ${round.round} is incomplete`);
    }
    if (round.message_transcript.some((message) => (
      message.timed_out
      || message.parse_error
      || message.return_code !== 0
      || new RegExp(`\\b${message.group}\\b`, "i").test(message.public_message)
      || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message.public_message)
    ))) {
      throw new Error(`${runName} round ${round.round} has an invalid accepted message`);
    }
    if (round.decisions.some((decision) => (
      decision.timed_out || decision.parse_error || decision.return_code !== 0
    ))) {
      throw new Error(`${runName} round ${round.round} has an invalid accepted action`);
    }
  }

  const messages = state.rounds.flatMap((round) =>
    round.message_transcript.map((message) => ({
      round: round.round,
      speaker_index: message.speaker_index,
      agent: message.agent,
      message: message.public_message,
    })),
  );

  const actions = state.rounds.flatMap((round) => {
    const decisionsByGroup = new Map(
      round.decisions.map((decision) => [decision.group, decision]),
    );
    return round.application_order.map((group, index) => {
      const decision = decisionsByGroup.get(group);
      if (!decision) throw new Error(`Missing ${group} decision in ${runName} round ${round.round}`);
      return {
        round: round.round,
        application_index: index + 1,
        agent: decision.agent,
        action: decision.action,
        x: decision.x,
        y: decision.y,
      };
    });
  });

  const expectedRecords = metadata.rounds * 3;
  if (messages.length !== expectedRecords || actions.length !== expectedRecords) {
    throw new Error(`${runName} does not contain three messages and actions per round`);
  }

  const finalScores = state.rounds.at(-1).scores_after;
  const changes = state.rounds.flatMap((round) => round.changes);
  return {
    run_id: metadata.run_id,
    run_number: runNumber,
    seed: metadata.seed,
    rounds: metadata.rounds,
    completed_at: metadata.completed_at,
    protocol: {
      messages: metadata.message_channel,
      message_order: metadata.message_speaking_order,
      actions: "simultaneous choices, randomized application order",
    },
    summary: {
      final_scores: Object.fromEntries(
        Object.entries(finalScores).map(([agent, score]) => [agent, score.target_owned]),
      ),
      paints: actions.filter((action) => action.action === "paint").length,
      passes: actions.filter((action) => action.action === "pass").length,
      yields: actions.filter((action) => action.action === "yield_claim").length,
      claims_on_empty: changes.filter((change) => change.replaced === null).length,
      cross_group_overwrites: changes.filter(
        (change) => change.replaced !== null && change.replaced !== change.agent,
      ).length,
    },
    messages,
    actions,
  };
}

const entries = (await readdir(runsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
  .map((entry) => entry.name)
  .sort();

if (entries.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} runs with prefix ${prefix}, found ${entries.length}`);
}

const numberedEntries = entries.map((runName) => ({
  runName,
  runNumber: Number(runName.slice(prefix.length)),
}));
const expectedNumbers = Array.from({ length: expectedCount }, (_, index) => index + 1);
if (
  numberedEntries.some(({ runNumber }) => !Number.isInteger(runNumber))
  || JSON.stringify(numberedEntries.map(({ runNumber }) => runNumber)) !== JSON.stringify(expectedNumbers)
) {
  throw new Error(`Expected a contiguous run sequence 01 through ${String(expectedCount).padStart(2, "0")}`);
}

const runs = await Promise.all(
  numberedEntries.map(({ runName, runNumber }) => buildRun(runName, runNumber)),
);

if (new Set(runs.map(({ seed }) => seed)).size !== runs.length) {
  throw new Error("Every bundled run must have a distinct seed");
}

await writeFile(
  resolve(webRoot, "app", "run-batch.json"),
  `${JSON.stringify({ batch_id: `${prefix}batch`, runs }, null, 2)}\n`,
  "utf8",
);
