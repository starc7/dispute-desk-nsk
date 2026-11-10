// The main screen: inbox on the left, the case in the middle, the agent on the right.
import { Play, RotateCcw, Send, UserCheck, Check, AlertTriangle, X } from "lucide-react";
import { Clock, KindTag, NoteWithRefs, STATUS_LABEL } from "../components/ui.jsx";
import { RULES } from "../config/rules.js";
import { checkDraft } from "../engine/guardrails.js";
import { DEMO_TODAY, fmt, money } from "../lib/dates.js";

export default function CasesView({ cases, sel, setSelId, rules, rulesId, runs, setDraftText, statuses, runAgent, approve, escalate, hi, setHi }) {
  const run = runs[sel.id];
  const status = statuses[sel.id];
  // Checks re-run live as the reviewer edits the reply.
  const checks = run?.status === "done" ? checkDraft(run.note, run.draftText, run.result) : null;
  const allPass = checks ? checks.every((c) => c.ok) : false;
  const stepDone = (i) => run?.steps?.[i]?.state === "done";

  return (
    <div className="grid">
      <aside className="inbox">
        <h2>{cases.length} open disputes. Today is {fmt(DEMO_TODAY)}.</h2>
        {cases.map((c) => (
          <button key={c.id} className="item" aria-current={c.id === sel.id} onClick={() => { setSelId(c.id); setHi(null); }}>
            <div className="row">
              <b>{c.customer}</b>
              {statuses[c.id] && <span className={`status ${statuses[c.id]}`}>{STATUS_LABEL[statuses[c.id]]}</span>}
            </div>
            <div className="small">{c.dispute.subject}</div>
            <Clock c={c} rules={rules} />
          </button>
        ))}
      </aside>

      <main className="pane">
        <h2 className="case-h">{sel.customer}</h2>
        <div className="meta">
          <span className="mono">{sel.id}</span>
          <span className="mono">{sel.invoice.no}</span>
          <span className="mono">{sel.container}</span>
          <span>{sel.chargeType}, {sel.port}</span>
          <span>Invoiced {money(sel.invoice.amount)}</span>
        </div>
        <Clock c={sel} rules={rules} big />

        <section className="sec">
          <h3>Customer email</h3>
          <div className="email">
            <div className="subj">{sel.dispute.subject}</div>
            <div className="small" style={{ marginBottom: 8 }}>From {sel.dispute.from}, received {fmt(sel.dispute.received)}</div>
            {sel.dispute.body}
          </div>
        </section>

        {stepDone(1) && run.evidence ? (
          <section className="sec">
            <h3>Records the agent pulled <KindTag kind="code" /></h3>
            {run.evidence.map((e) => (
              <div key={e.id} className={`ev ${hi === e.id ? "hi" : ""}`}>
                <span className="mono">{e.id}</span>
                <span><span className="small">{e.label}: </span>{e.value}</span>
                <span className="src">{e.source}</span>
              </div>
            ))}
          </section>
        ) : (
          <p className="empty">Run the agent to pull this container's records from the six connected systems.</p>
        )}

        {stepDone(3) && run.result && (
          <section className="sec">
            <h3>Checks against the {RULES[run.rulesId].short} <KindTag kind="code" /></h3>
            {run.result.findings.map((f, i) => (
              <div key={i} className={`finding ${f.warn ? "warn" : f.ok ? "ok" : "bad"}`}>
                <div><span className="t">{f.title}</span>{f.rule && <span className="rule">{f.rule}</span>}</div>
                <div className="small">{f.detail}</div>
              </div>
            ))}
          </section>
        )}
      </main>

      <aside className="agent">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2>Agent</h2>
          <button className="btn primary" onClick={() => runAgent(sel.id)} disabled={run?.status === "running" || status === "sent"}>
            {run ? <RotateCcw size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            {run ? "Run again" : "Run agent"}
          </button>
        </div>

        {!run && <p className="empty">The agent reads the email, gathers records, checks the rules and drafts a reply. Nothing is sent until you approve it.</p>}

        {run?.status === "error" && (
          <div className="banner error"><span>The agent stopped: {run.error}</span></div>
        )}

        {run?.status === "done" && run.rulesId !== rulesId && (
          <div className="banner">
            <span>This run used the {RULES[run.rulesId].short}. The rules have changed since.</span>
            <button className="btn" onClick={() => runAgent(sel.id)}>Run again</button>
          </div>
        )}

        {run?.steps && (
          <div style={{ marginTop: 14 }}>
            {run.steps.map((s, i) => (
              <div key={i} className={`step ${s.state}`}>
                <span className="dot">{s.state === "done" && <Check size={12} aria-hidden="true" />}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>{s.label}</span>
                    <KindTag kind={s.kind} />
                  </div>
                  {s.note && <div className="note">{s.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {run?.extract && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>What the customer is saying</strong>
              <KindTag kind="ai" />
            </div>
            <p style={{ margin: "6px 0 2px", fontSize: 14 }}>{run.extract.reason}</p>
            <div className="small">Wants: {run.extract.ask}. Type: {run.extract.claim}. Confidence: {run.extract.confidence}.</div>
          </div>
        )}

        {run?.status === "done" && (
          <>
            <div className={`rec ${run.result.rec.code === "ESCALATE" ? "escalate" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="small">Recommendation</span>
                <KindTag kind="code" />
              </div>
              <div className="big">
                {run.result.rec.code === "ESCALATE" && <AlertTriangle size={20} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }} />}
                {run.result.rec.label}
              </div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{run.result.rec.summary}</div>
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Note for the reviewer</strong>
                <KindTag kind="ai" />
              </div>
              <NoteWithRefs text={run.note} onRef={setHi} />
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label htmlFor="reply"><strong>Reply to the customer</strong> <span className="small">(you can edit it)</span></label>
                <KindTag kind="ai" />
              </div>
              <textarea id="reply" value={run.draftText} disabled={status === "sent"} onChange={(e) => setDraftText(sel.id, e.target.value)} />
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong>Checks before sending</strong>
                <KindTag kind="code" />
              </div>
              {checks.map((k, i) => (
                <div key={i} className="check">
                  <span className={`ic ${k.ok ? "ok" : "bad"}`}>{k.ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}</span>
                  <div>{k.label}<div className="small">{k.detail}</div></div>
                </div>
              ))}
            </div>

            <div className="actions">
              <button className="btn primary" onClick={() => approve(sel.id)} disabled={!allPass || status === "sent"}>
                <Send size={15} aria-hidden="true" /> {status === "sent" ? "Sent" : "Approve and send"}
              </button>
              <button className="btn" onClick={() => escalate(sel.id)} disabled={status === "sent" || status === "escalated"}>
                <UserCheck size={15} aria-hidden="true" /> {status === "escalated" ? "Escalated" : "Escalate to supervisor"}
              </button>
            </div>
            {!allPass && <p className="small" style={{ marginTop: 8 }}>Sending is locked until every check passes. Fix the reply or escalate.</p>}

            <p className="small" style={{ marginTop: 14 }}>
              {run.meta.mode === "live" && !run.meta.fallback
                ? `${run.meta.aiCalls} AI calls to ${run.meta.model || "Claude"}, ${run.meta.tokens.toLocaleString()} tokens, ${(run.meta.aiMs / 1000).toFixed(1)} s of AI time. Everything else ran as code.`
                : run.meta.fallback
                ? "AI was unavailable, so the agent used saved readings and templates. The rules and checks still ran."
                : "Offline mode: no AI calls. The rules and checks ran as normal."}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
