// The integration plan: which systems the agent reads, and how each becomes real in a pilot.
import { ALL_ADAPTERS } from "../adapters/index.js";

export default function SystemsView({ health }) {
  return (
    <div className="page">
      <h2>What the agent connects to</h2>
      <p className="lead">
        Each system is an adapter: a small plug with the same shape. Today every adapter returns synthetic records. In a pilot, each one is swapped for a
        read-only connection, one at a time, without changing the agent. The code lives in src/adapters/index.js.
      </p>
      <table className="tbl">
        <thead>
          <tr><th>System</th><th>What the agent reads</th><th>Access</th><th>Today</th><th>In a pilot</th></tr>
        </thead>
        <tbody>
          {ALL_ADAPTERS.map((a) => (
            <tr key={a.key}>
              <td><strong>{a.name}</strong></td>
              <td>{a.reads}</td>
              <td>{a.access}</td>
              <td className="small">{a.mode === "mock" ? "Mock, synthetic data" : "Live"}</td>
              <td className="small">{a.pilot}</td>
            </tr>
          ))}
          <tr>
            <td><strong>Outbox</strong></td>
            <td>Nothing. It writes drafts.</td>
            <td>Draft only</td>
            <td className="small">In-app list</td>
            <td className="small">Drafts land in the mailbox. A person sends them.</td>
          </tr>
          <tr>
            <td><strong>Claude</strong></td>
            <td>Only the email text, and facts the code already worked out</td>
            <td>Through our server</td>
            <td className="small">{health.aiConfigured ? `Live, ${health.model}` : "Not set up, offline mode"}</td>
            <td className="small">Inside the client's cloud, with a provider their security team approves</td>
          </tr>
        </tbody>
      </table>
      <div className="two">
        <div className="panel">
          <h3>The agent can</h3>
          <ul>
            <li>Read emails and records</li>
            <li>Calculate charges and check deadlines</li>
            <li>Recommend an outcome and draft a reply</li>
            <li>Refuse to decide when records disagree</li>
          </ul>
        </div>
        <div className="panel">
          <h3>The agent can't</h3>
          <ul>
            <li>Send anything without a person approving it</li>
            <li>Change an invoice or issue a credit</li>
            <li>Use a dollar amount that the code didn't calculate</li>
            <li>Write to any system of record</li>
          </ul>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>How a request flows</h3>
        <p style={{ margin: 0 }}>
          Browser screens, then our server (which holds the API key and limits how often each visitor can call the AI), then the Claude API. The
          browser never sees the key. Every agent step and every human decision goes to the audit log.
        </p>
      </div>
    </div>
  );
}
