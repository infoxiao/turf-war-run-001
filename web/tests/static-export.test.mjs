import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("exports a complete 20-run static explorer", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Turf\/War — Multiagent Canvas Experiment<\/title>/i);
  assert.match(html, /How territorial/);
  assert.match(html, /Homage to/);
  assert.match(html, /PUBLIC MESSAGE CHANNEL/);
  assert.match(html, /data-message-round="24"/);
  assert.equal((html.match(/class="event-action"/g) ?? []).length, 72);
  assert.equal((html.match(/<option /g) ?? []).length, 20);
  assert.equal((html.match(/is-target/g) ?? []).length, 25);
  assert.doesNotMatch(html, /trajectory-layer|<polyline|<svg/i);
});

test("the embedded dataset contains the frozen accepted cohort", async () => {
  const batch = JSON.parse(
    await readFile(new URL("../app/run-batch.json", import.meta.url), "utf8"),
  );

  assert.equal(batch.runs.length, 20);
  assert.deepEqual(
    batch.runs.map((run) => run.seed),
    Array.from({ length: 20 }, (_, index) => 20260820 + index),
  );
  for (const run of batch.runs) {
    assert.equal(run.messages.length, 72);
    assert.equal(run.actions.length, 72);
  }
});
