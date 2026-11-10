// Small pieces of UI used across screens.
import { Bot, Calculator } from "lucide-react";
import { DEMO_TODAY, addDays, diff, fmt } from "../lib/dates.js";

// The 30-day response clock: one bar segment per day.
export function Clock({ c, rules, big }) {
  const due = addDays(c.dispute.received, rules.respondDays);
  const used = Math.max(0, Math.min(30, diff(c.dispute.received, DEMO_TODAY)));
  const left = diff(DEMO_TODAY, due);
  const tight = left <= 7;
  return (
    <div>
      <div className={`clock ${big ? "big" : ""} ${tight ? "tight" : ""}`} role="img" aria-label={`${used} of 30 days used, ${left} days left`}>
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} className={i < used ? "used" : ""} />
        ))}
      </div>
      {big ? (
        <div className="clockline">
          <strong>{left} days left</strong> to respond. Due {fmt(due)}.
        </div>
      ) : (
        <div className="small">{left} days left</div>
      )}
    </div>
  );
}

// The label that shows whether a step was done by AI or by code.
export function KindTag({ kind }) {
  return kind === "ai" ? (
    <span className="tag ai">
      <Bot size={13} aria-hidden="true" /> AI
    </span>
  ) : (
    <span className="tag code">
      <Calculator size={13} aria-hidden="true" /> Code
    </span>
  );
}

// Shows the AI's reviewer note with each [E#] as a clickable chip.
export function NoteWithRefs({ text, onRef }) {
  const parts = (text || "").split(/(\[E\d+\])/g);
  return (
    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
      {parts.map((p, i) => {
        const m = p.match(/^\[(E\d+)\]$/);
        return m ? (
          <button key={i} className="refbtn" onClick={() => onRef(m[1])} title="Show this evidence">
            {m[1]}
          </button>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </p>
  );
}

export const STATUS_LABEL = { ready: "Draft ready", needs: "Needs a person", sent: "Sent", escalated: "Escalated" };
