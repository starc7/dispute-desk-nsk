// Shows every open dispute under both rule versions, side by side.
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { RULES } from "../config/rules.js";
import { evaluate } from "../engine/evaluate.js";
import { now } from "../lib/dates.js";

export default function BacklogView({ cases, rulesId, log }) {
  const [recheck, setRecheck] = useState(null);
  const rows = useMemo(() => cases.map((c) => ({ c, old: evaluate(c, RULES["2024-05"]), cur: evaluate(c, RULES["2025-12"]) })), [cases]);

  function doRecheck() {
    const t0 = performance.now();
    const results = cases.map((c) => [evaluate(c, RULES["2024-05"]).rec.code, evaluate(c, RULES["2025-12"]).rec.code]);
    const ms = (performance.now() - t0).toFixed(1);
    const changed = results.filter(([a, b]) => a !== b).length;
    setRecheck({ ms, changed, at: now() });
    log("System", `Re-checked ${cases.length} open disputes in ${ms} ms. ${changed} outcome changed between rule versions.`);
  }

  return (
    <div className="page">
      <h2>When the rule changes, change the rules file</h2>
      <p className="lead">
        In September 2025 a court set aside the part of the FMC rule that said who may be billed. Here the rules are a setting, not text inside the
        AI's instructions, so every open dispute can be re-checked in milliseconds and the differences are easy to see.
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <button className="btn primary" onClick={doRecheck}><RotateCcw size={15} aria-hidden="true" /> Re-check all open disputes</button>
        {recheck && <span className="small">Checked {cases.length} disputes in {recheck.ms} ms at {recheck.at}. {recheck.changed} outcome changed.</span>}
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Dispute</th>
            <th className={rulesId === "2024-05" ? "sel" : ""}>Under the May 2024 rule</th>
            <th className={rulesId === "2025-12" ? "sel" : ""}>Under the current rule</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ c, old, cur }) => {
            const changed = old.rec.code !== cur.rec.code;
            return (
              <tr key={c.id} className={changed ? "changed" : ""}>
                <td>
                  <strong>{c.customer}</strong>
                  <div className="small mono">{c.id}</div>
                  {changed && <div className="small" style={{ color: "var(--ink)", fontWeight: 600 }}>Outcome changed</div>}
                </td>
                <td className={rulesId === "2024-05" ? "sel" : ""}>{old.rec.label}<div className="small">{old.rec.summary}</div></td>
                <td className={rulesId === "2025-12" ? "sel" : ""}>{cur.rec.label}<div className="small">{cur.rec.summary}</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="small" style={{ marginTop: 10 }}>{RULES[rulesId].note}</p>
    </div>
  );
}
