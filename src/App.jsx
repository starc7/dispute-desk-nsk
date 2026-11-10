// The app shell. It holds the shared state (which case is open, agent runs,
// statuses, audit log) and passes it to the screens.
import { useEffect, useMemo, useRef, useState } from "react";
import { RULES, DEFAULT_RULES_ID } from "./config/rules.js";
import { loadAllCases } from "./agent/caseFile.js";
import { runPipeline, STEP_DEFS } from "./agent/pipeline.js";
import { getHealth } from "./ai/client.js";
import { DEMO_TODAY, fmt, now } from "./lib/dates.js";
import CasesView from "./views/CasesView.jsx";
import BacklogView from "./views/BacklogView.jsx";
import SystemsView from "./views/SystemsView.jsx";
import ImpactView from "./views/ImpactView.jsx";
import AuditView from "./views/AuditView.jsx";

const TABS = [
  ["cases", "Disputes"],
  ["backlog", "Rule changes"],
  ["systems", "Connected systems"],
  ["impact", "Impact"],
  ["audit", "Audit log"],
];

export default function App() {
  const [tab, setTab] = useState("cases");
  const [rulesId, setRulesId] = useState(DEFAULT_RULES_ID);
  const [health, setHealth] = useState({ ok: false, aiConfigured: false, model: null, checked: false });
  const [aiMode, setAiMode] = useState("offline");
  const [cases, setCases] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selId, setSelId] = useState(null);
  const [runs, setRuns] = useState({});
  const [statuses, setStatuses] = useState({});
  const [audit, setAudit] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [hi, setHi] = useState(null);

  const rules = RULES[rulesId];
  const log = (actor, text) => setAudit((a) => [{ t: now(), actor, text }, ...a]);

  // On start: ask the server whether live AI is set up, and load the open disputes.
  // The ref stops React's development mode from doing this twice.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    getHealth().then((h) => {
      setHealth({ ...h, checked: true });
      if (h.aiConfigured) setAiMode("live");
    });
    loadAllCases()
      .then((list) => {
        setCases(list);
        setSelId(list[0]?.id);
        log("System", `Loaded ${list.length} open disputes through 6 adapters (synthetic data).`);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  function changeRules(id) {
    setRulesId(id);
    log("You", `Switched to "${RULES[id].label}".`);
  }

  async function runAgent(id) {
    const rid = rulesId;
    const mode = aiMode;
    setRuns((r) => ({ ...r, [id]: { status: "running", rulesId: rid, steps: STEP_DEFS.map((s) => ({ ...s, state: "waiting" })) } }));
    const onStep = (i, patch) =>
      setRuns((r) => ({ ...r, [id]: { ...r[id], steps: r[id].steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) } }));
    const onData = (patch) => setRuns((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
    log("Agent", `Started on ${id} using the ${RULES[rid].short}, AI ${mode}.`);

    try {
      const out = await runPipeline({ disputeId: id, rules: RULES[rid], aiMode: mode, onStep, onData });
      onData({
        status: "done",
        result: out.result,
        note: out.draft.internal_note,
        draftText: out.draft.customer_reply,
        originalDraft: out.draft.customer_reply,
        meta: out.meta,
      });
      setStatuses((s) => ({ ...s, [id]: out.result.rec.code === "ESCALATE" ? "needs" : "ready" }));
      log("Agent", `Finished ${id}: ${out.result.rec.label}.${out.meta.fallback ? " AI unavailable, used fallback." : ""}`);
    } catch (e) {
      onData({ status: "error", error: e.message });
      log("Agent", `Stopped on ${id}: ${e.message}`);
    }
  }

  const setDraftText = (id, text) => setRuns((r) => ({ ...r, [id]: { ...r[id], draftText: text } }));

  function approve(id) {
    const run = runs[id];
    const c = cases.find((x) => x.id === id);
    const edited = run.draftText !== run.originalDraft;
    setOutbox((o) => [{ t: now(), id, to: c.dispute.from, text: run.draftText, edited }, ...o]);
    setApprovals((a) => [...a, { id, edited }]);
    setStatuses((s) => ({ ...s, [id]: "sent" }));
    log("You", `Approved and sent the reply on ${id} (${run.result.rec.label})${edited ? ", after editing" : ""}.`);
  }

  function escalate(id) {
    setStatuses((s) => ({ ...s, [id]: "escalated" }));
    log("You", `Escalated ${id} to a supervisor.`);
  }

  // Numbers for the Impact screen's "measured in this session" table.
  const stats = useMemo(() => {
    const done = Object.values(runs).filter((r) => r.status === "done");
    const live = done.filter((r) => r.meta.mode === "live" && !r.meta.fallback);
    return {
      done: done.length,
      escalatedByAgent: done.filter((r) => r.result.rec.code === "ESCALATE").length,
      approved: approvals.length,
      unedited: approvals.filter((a) => !a.edited).length,
      liveRuns: live.length,
      avgAiMs: live.length ? live.reduce((s, r) => s + r.meta.aiMs, 0) / live.length : 0,
      avgTokens: live.length ? live.reduce((s, r) => s + r.meta.tokens, 0) / live.length : 0,
    };
  }, [runs, approvals]);

  const sel = cases?.find((c) => c.id === selId);

  return (
    <div className="dd">
      <header className="top">
        <div className="brand">
          <div className="brand-lockup">
            <span className="maersk-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" focusable="false">
                <polygon points="16,1 19.2,10.2 27.7,5.1 24.7,14.4 31,16 24.7,17.6 27.7,26.9 19.2,21.8 16,31 12.8,21.8 4.3,26.9 7.3,17.6 1,16 7.3,14.4 4.3,5.1 12.8,10.2" />
              </svg>
            </span>
            <span className="maersk-wordmark">MAERSK</span>
            <span className="brand-divider" aria-hidden="true" />
            <div>
              <h1>Dispute Desk</h1>
              <p>US demurrage and detention disputes. Prototype with synthetic data.</p>
            </div>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map(([k, l]) => (
            <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
        <div className="controls">
          <label>
            Rules
            <select value={rulesId} onChange={(e) => changeRules(e.target.value)}>
              {Object.values(RULES).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label>
            AI
            <select value={aiMode} onChange={(e) => setAiMode(e.target.value)}>
              <option value="live" disabled={!health.aiConfigured}>Live (Claude){health.aiConfigured ? "" : ", not set up"}</option>
              <option value="offline">Offline (templates)</option>
            </select>
          </label>
        </div>
      </header>

      {loadError && <div className="page"><div className="banner error">Couldn't load disputes: {loadError}</div></div>}
      {!cases && !loadError && <div className="page"><p className="lead">Loading open disputes from the connected systems…</p></div>}

      {cases && sel && (
        <>
          {tab === "cases" && (
            <CasesView
              cases={cases} sel={sel} setSelId={setSelId} rules={rules} rulesId={rulesId}
              runs={runs} setDraftText={setDraftText} statuses={statuses}
              runAgent={runAgent} approve={approve} escalate={escalate} hi={hi} setHi={setHi}
            />
          )}
          {tab === "backlog" && <BacklogView cases={cases} rulesId={rulesId} log={log} />}
          {tab === "systems" && <SystemsView health={health} />}
          {tab === "impact" && <ImpactView stats={stats} />}
          {tab === "audit" && <AuditView audit={audit} outbox={outbox} />}
        </>
      )}

      <footer className="foot">
        Prototype for discussion. Synthetic data, not affiliated with or endorsed by Maersk. The clock is frozen at {fmt(DEMO_TODAY)} so the demo is
        repeatable.{health.checked && !health.aiConfigured ? " Live AI is off: add ANTHROPIC_API_KEY to the .env file and restart." : ""}
      </footer>
    </div>
  );
}
