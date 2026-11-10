// The value calculator. The client types their own numbers and sees the result.
// The defaults are example numbers, not Maersk's.
import { useState } from "react";

const DEFAULTS = {
  disputes: 2000,
  minutesBefore: 25,
  minutesAfter: 8,
  hoursPerPerson: 140,
  costPerHour: 45,
  invoices: 15000,
  avgInvoice: 600,
  lostShare: 2,
  catchShare: 80,
};

const FIELDS = [
  ["disputes", "Disputes per month"],
  ["minutesBefore", "Minutes per dispute today"],
  ["minutesAfter", "Minutes per dispute with the agent"],
  ["hoursPerPerson", "Working hours per person per month"],
  ["costPerHour", "Cost per staff hour ($)"],
  ["invoices", "D&D invoices sent per month"],
  ["avgInvoice", "Average invoice ($)"],
  ["lostShare", "Invoices uncollectable today: late or missing details (%)"],
  ["catchShare", "Share a pre-send check would catch (%)"],
];

const n = (x) => Math.round(x).toLocaleString("en-US");

export default function ImpactView({ stats }) {
  const [v, setV] = useState(DEFAULTS);
  const set = (k) => (e) => setV({ ...v, [k]: Math.max(0, Number(e.target.value) || 0) });

  const hoursSaved = (v.disputes * Math.max(0, v.minutesBefore - v.minutesAfter)) / 60;
  const people = v.hoursPerPerson ? hoursSaved / v.hoursPerPerson : 0;
  const labour = hoursSaved * v.costPerHour;
  const protectedRev = v.invoices * v.avgInvoice * (v.lostShare / 100) * (v.catchShare / 100);

  return (
    <div className="page">
      <h2>What it's worth to you</h2>
      <p className="lead">
        These are example numbers, not real Maersk figures. Replace them with yours and the results update as you type.
      </p>

      <div className="fields">
        {FIELDS.map(([k, label]) => (
          <label key={k} className="field">
            <span>{label}</span>
            <input type="number" min="0" value={v[k]} onChange={set(k)} />
          </label>
        ))}
      </div>

      <h3 style={{ marginTop: 26, fontSize: 18 }}>Results per month</h3>
      <div className="results">
        <div className="result">
          <div className="small">Staff hours saved</div>
          <div className="val">{n(hoursSaved)} hours</div>
          <div className="how">{n(v.disputes)} × ({v.minutesBefore} − {v.minutesAfter} min) ÷ 60</div>
        </div>
        <div className="result">
          <div className="small">Equal to</div>
          <div className="val">{people.toFixed(1)} people's time</div>
          <div className="how">{n(hoursSaved)} hours ÷ {v.hoursPerPerson} hours per person</div>
        </div>
        <div className="result">
          <div className="small">Value of that time</div>
          <div className="val">${n(labour)}</div>
          <div className="how">{n(hoursSaved)} hours × ${v.costPerHour}</div>
        </div>
        <div className="result next">
          <div className="small">Revenue protected (next phase: check invoices before they go out)</div>
          <div className="val">${n(protectedRev)}</div>
          <div className="how">{n(v.invoices)} × ${n(v.avgInvoice)} × {v.lostShare}% × {v.catchShare}%</div>
        </div>
      </div>

      <h3 style={{ marginTop: 30, fontSize: 18 }}>Measured in this session</h3>
      <p className="lead" style={{ marginBottom: 10 }}>
        In a pilot, these are the numbers you'd track every week in shadow mode, before giving the agent more responsibility.
      </p>
      <table className="tbl">
        <tbody>
          <tr><td>Cases the agent finished</td><td>{stats.done}</td></tr>
          <tr><td>Cases the agent escalated because records disagreed</td><td>{stats.escalatedByAgent}</td></tr>
          <tr><td>Replies approved</td><td>{stats.approved}</td></tr>
          <tr><td>Approved without any edits (agreement rate)</td><td>{stats.approved ? `${stats.unedited} of ${stats.approved} (${Math.round((stats.unedited / stats.approved) * 100)}%)` : "None yet"}</td></tr>
          <tr><td>Average AI time per case</td><td>{stats.liveRuns ? `${(stats.avgAiMs / 1000).toFixed(1)} s` : "No live AI runs yet"}</td></tr>
          <tr><td>Average tokens per case</td><td>{stats.liveRuns ? n(stats.avgTokens) : "No live AI runs yet"}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
