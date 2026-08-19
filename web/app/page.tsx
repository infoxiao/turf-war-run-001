"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import runData from "./run-batch.json";

type AgentId = "amber" | "blue" | "green";

type MessageEvent = {
  round: number;
  agent: AgentId;
  speaker_index: number;
  message: string;
};

type PixelAction = {
  round: number;
  agent: AgentId;
  application_index: number;
  action: "paint" | "pass" | "yield_claim";
  x: number;
  y: number;
};

type RunRecord = {
  run_id: string;
  run_number: number;
  seed: number;
  rounds: number;
  summary: {
    final_scores: Record<AgentId, number>;
    paints: number;
    passes: number;
    yields: number;
    claims_on_empty: number;
    cross_group_overwrites: number;
  };
  messages: MessageEvent[];
  actions: PixelAction[];
};

const SIZE = 12;

const agents: Record<AgentId, { name: string; short: string; target: [number, number, number, number] }> = {
  amber: { name: "Amber", short: "A", target: [3, 3, 7, 7] },
  blue: { name: "Blue", short: "B", target: [3, 3, 7, 7] },
  green: { name: "Green", short: "G", target: [3, 3, 7, 7] },
};

const runs = runData.runs as RunRecord[];

const orderedAgents: AgentId[] = ["amber", "blue", "green"];

function ownerAt(actionsToRound: PixelAction[], x: number, y: number) {
  let owner: AgentId | null = null;
  for (const action of actionsToRound) {
    if (action.action === "paint" && action.x === x && action.y === y) owner = action.agent;
  }
  return owner;
}

function targetCoverage(actionsToRound: PixelAction[], agent: AgentId) {
  const [x1, y1, x2, y2] = agents[agent].target;
  let count = 0;
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      if (ownerAt(actionsToRound, x, y) === agent) count += 1;
    }
  }
  return count;
}

export default function Home() {
  const [runIndex, setRunIndex] = useState(0);
  const currentRun = runs[runIndex];
  const maxRound = currentRun.rounds;
  const messages = currentRun.messages;
  const actions = currentRun.actions;
  const [round, setRound] = useState(maxRound);
  const [activeAgent, setActiveAgent] = useState<AgentId | "all">("all");
  const [playing, setPlaying] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>([3, 3]);
  const messageFeedRef = useRef<HTMLOListElement>(null);
  const pendingMessageRoundRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestedRun = Number(new URL(window.location.href).searchParams.get("run"));
      const requestedIndex = runs.findIndex((candidate) => candidate.run_number === requestedRun);
      if (requestedIndex >= 0) {
        setRunIndex(requestedIndex);
        setRound(runs[requestedIndex].rounds);
        setPlaying(false);
        setActiveAgent("all");
        setSelectedCell([3, 3]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setRound((current) => {
        if (current >= maxRound) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [maxRound, playing]);

  const visibleActions = useMemo(
    () => actions.filter((action) => action.round <= round),
    [actions, round],
  );
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.round <= round),
    [messages, round],
  );
  const filteredMessages = useMemo(
    () => visibleMessages.filter((message) => activeAgent === "all" || message.agent === activeAgent),
    [activeAgent, visibleMessages],
  );
  const actionByRoundAndAgent = useMemo(
    () => new Map(actions.map((action) => [`${action.round}:${action.agent}`, action])),
    [actions],
  );
  const messageRounds = useMemo(() => {
    const rounds: Array<{ round: number; messages: MessageEvent[] }> = [];
    for (const event of filteredMessages) {
      const current = rounds.at(-1);
      if (!current || current.round !== event.round) {
        rounds.push({ round: event.round, messages: [event] });
      } else {
        current.messages.push(event);
      }
    }
    return rounds;
  }, [filteredMessages]);

  useEffect(() => {
    const targetRound = pendingMessageRoundRef.current;
    if (targetRound === null || targetRound !== round) return;
    pendingMessageRoundRef.current = null;

    const frame = window.requestAnimationFrame(() => {
      const feed = messageFeedRef.current;
      if (!feed) return;
      if (targetRound === 0) {
        feed.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
      const target = feed.querySelector<HTMLElement>(`[data-message-round="${targetRound}"]`);
      if (!target) return;
      const top = target.getBoundingClientRect().top - feed.getBoundingClientRect().top + feed.scrollTop;
      feed.scrollTo({ top, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filteredMessages, round]);

  const selectedHistory = selectedCell
    ? visibleActions.filter((action) => action.action === "paint" && action.x === selectedCell[0] && action.y === selectedCell[1])
    : [];
  const latestSelected = selectedHistory.at(-1);

  function playFromStart() {
    if (round >= maxRound) setRound(0);
    setPlaying(true);
  }

  function selectRun(index: number) {
    setRunIndex(index);
    setPlaying(false);
    setRound(runs[index].rounds);
    setActiveAgent("all");
    setSelectedCell([3, 3]);
    const url = new URL(window.location.href);
    url.searchParams.set("run", String(runs[index].run_number).padStart(2, "0"));
    window.history.replaceState({}, "", url);
  }

  function inspectAction(action: PixelAction) {
    if (action.action !== "paint") return;
    setPlaying(false);
    setRound(action.round);
    setSelectedCell([action.x, action.y]);
    pendingMessageRoundRef.current = action.round;
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Turf War home">
          TURF<span>/</span>WAR
        </a>
        <p>Twenty runs on one shared canvas.</p>
        <div className="status-dot"><span /> run {runIndex + 1} of {runs.length}</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">SHARED-CANVAS AGENT SIMULATION</p>
          <h1>How territorial<br />do agents get?</h1>
          <p className="dek">
            Inspired by Anthropic’s turf war study and the internet’s best traditions of <code>r/place</code>,
            we run agents on a shared pixel canvas to see how territorial they become. These 20 simulations
            are a starting point.
          </p>
        </div>
        <div className="hero-note">
          <span>STARTING POINT</span>
          <p>Three agents · one shared target zone · one pixel action per round.</p>
        </div>
      </section>

      <section className="experiment-shell" aria-label="Shared canvas experiment">
        <div className="experiment-toolbar">
          <div className="run-control">
            <label htmlFor="run-select">Run</label>
            <select
              id="run-select"
              value={runIndex}
              onChange={(event) => selectRun(Number(event.target.value))}
            >
              {runs.map((run, index) => (
                <option key={run.run_id} value={index}>
                  {String(run.run_number).padStart(2, "0")} · seed {run.seed} · {run.summary.final_scores.amber}/{run.summary.final_scores.blue}/{run.summary.final_scores.green} · {run.summary.cross_group_overwrites} overwrites
                </option>
              ))}
            </select>
          </div>
          <div className="round-control">
            <button className="play-button" type="button" onClick={() => playing ? setPlaying(false) : playFromStart()}>
              {playing ? "Pause" : round >= maxRound ? "Replay" : "Play"}
            </button>
            <label htmlFor="round-range">Round <strong>{round}</strong> / {maxRound}</label>
            <input
              id="round-range"
              type="range"
              min="0"
              max={maxRound}
              value={round}
              onChange={(event) => {
                const nextRound = Number(event.target.value);
                setPlaying(false);
                pendingMessageRoundRef.current = nextRound;
                setRound(nextRound);
              }}
            />
          </div>
          <div className="agent-filter" aria-label="Filter agents">
            <button type="button" className={activeAgent === "all" ? "is-active" : ""} onClick={() => setActiveAgent("all")}>All agents</button>
            {orderedAgents.map((agent) => (
              <button
                key={agent}
                type="button"
                data-agent={agent}
                className={activeAgent === agent ? "is-active" : ""}
                onClick={() => setActiveAgent(agent)}
              >
                <i />{agents[agent].name}
              </button>
            ))}
          </div>
        </div>

        <div className="experiment-grid">
          <div className="canvas-column">
            <div className="canvas-frame">
              <div className="axis axis-x" aria-hidden="true">
                {Array.from({ length: SIZE }, (_, index) => <span key={index}>{index}</span>)}
              </div>
              <div className="axis axis-y" aria-hidden="true">
                {Array.from({ length: SIZE }, (_, index) => <span key={index}>{index}</span>)}
              </div>
              <div className="pixel-canvas" role="grid" aria-label={`Canvas after round ${round}`}>
                {Array.from({ length: SIZE * SIZE }, (_, index) => {
                  const x = index % SIZE;
                  const y = Math.floor(index / SIZE);
                  const owner = ownerAt(visibleActions, x, y);
                  const isSelected = selectedCell?.[0] === x && selectedCell?.[1] === y;
                  const isTarget = x >= 3 && x <= 7 && y >= 3 && y <= 7;
                  const pixelClasses = [
                    "pixel",
                    isTarget && "is-target",
                    isTarget && y === 3 && "target-top",
                    isTarget && x === 7 && "target-right",
                    isTarget && y === 7 && "target-bottom",
                    isTarget && x === 3 && "target-left",
                    isSelected && "is-selected",
                  ].filter(Boolean).join(" ");
                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      role="gridcell"
                      data-owner={owner ?? "empty"}
                      className={pixelClasses}
                      aria-label={`Pixel ${x}, ${y}: ${owner ? `${agents[owner].name} owned` : "empty"}${isTarget ? "; inside the shared target" : ""}`}
                      onClick={() => setSelectedCell([x, y])}
                    >
                      {owner ? agents[owner].short : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="target-key">
              <i aria-hidden="true" />
              <span>Shared target zone</span>
              <strong>x=3..7 · y=3..7 · 25 pixels</strong>
            </div>

            <div className="selected-detail" aria-live="polite">
              <span>SELECTED PIXEL</span>
              <strong>{selectedCell ? `(${selectedCell[0]}, ${selectedCell[1]})` : "—"}</strong>
              <p>
                {latestSelected
                  ? `${agents[latestSelected.agent].name} owns it after ${selectedHistory.length} total claim${selectedHistory.length === 1 ? "" : "s"}.`
                  : "No claim has reached this pixel yet."}
              </p>
              {selectedHistory.length > 1 && <em>{selectedHistory.map((event) => agents[event.agent].short).join(" → ")}</em>}
            </div>
          </div>

          <aside className="trajectory-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">PUBLIC MESSAGE CHANNEL</p>
                <h2>{activeAgent === "all" ? "Timeline" : `${agents[activeAgent].name} timeline`}</h2>
              </div>
              <span>{filteredMessages.length} messages</span>
            </div>

            <div className="coverage-list">
              {orderedAgents.map((agent) => (
                <div key={agent} className="coverage-row" data-agent={agent}>
                  <span><i />{agents[agent].name}</span>
                  <div><b style={{ width: `${(targetCoverage(visibleActions, agent) / 25) * 100}%` }} /></div>
                  <strong>{targetCoverage(visibleActions, agent)}/25</strong>
                </div>
              ))}
            </div>

            <p className="message-key">
              Each message is paired with that agent’s action from the same round. Speaking and application order may differ.
            </p>

            <ol className="event-feed" ref={messageFeedRef}>
              {messageRounds.map((messageRound) => (
                <li className="message-round" data-message-round={messageRound.round} key={messageRound.round}>
                  <p className="round-heading">Round {messageRound.round}</p>
                  <ol className="round-messages">
                    {messageRound.messages.map((event) => {
                      const pairedAction = actionByRoundAndAgent.get(`${event.round}:${event.agent}`);
                      return (
                        <li key={`${event.round}-${event.speaker_index}-${event.agent}`} data-agent={event.agent}>
                          <p className="message-speaker">
                            <i />{agents[event.agent].name}<span>spoke {event.speaker_index}/3</span>
                          </p>
                          <blockquote className="event-message">
                            <span aria-hidden="true">“</span>
                            <p>{event.message}</p>
                          </blockquote>
                          {pairedAction && (
                            <div className="event-action" data-agent={event.agent}>
                              <span>Action</span>
                              {pairedAction.action === "paint" ? (
                                <div className="paint-action">
                                  <i aria-hidden="true" />
                                  <strong>Painted pixel ({pairedAction.x}, {pairedAction.y})</strong>
                                  <button
                                    className="inspect-button"
                                    type="button"
                                    aria-label={`Inspect pixel ${pairedAction.x}, ${pairedAction.y} at round ${pairedAction.round}`}
                                    onClick={() => inspectAction(pairedAction)}
                                  >
                                    Inspect
                                  </button>
                                </div>
                              ) : (
                                <strong>{pairedAction.action === "pass" ? "Passed" : `Yielded pixel (${pairedAction.x}, ${pairedAction.y})`}</strong>
                              )}
                              <em>applied {pairedAction.application_index}/3</em>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="source-note">
        <p className="eyebrow">INSPIRATION</p>
        <p>
          Inspired by <a href="https://www.anthropic.com/research/multiagent-systems" target="_blank" rel="noreferrer">Patterns and problems in emerging multiagent systems · Anthropic</a>. Homage to <code>r/place</code>.
        </p>
      </section>

      <footer>
        <p>TURF/WAR · 20 RECORDED SIMULATIONS</p>
        <p>SHARED TARGET ZONE · X=3..7 · Y=3..7</p>
      </footer>
    </main>
  );
}
