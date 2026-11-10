// Everything that happened, newest first, plus the replies that were sent.
export default function AuditView({ audit, outbox }) {
  return (
    <div className="page">
      <h2>Audit log</h2>
      <p className="lead">Every agent step and every human decision, newest first.</p>
      <div className="log">
        {audit.map((a, i) => (
          <div key={i}>
            <span className="mono">{a.t}</span>
            <strong>{a.actor}</strong>
            <span>{a.text}</span>
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: 28, fontSize: 24 }}>Sent replies</h2>
      {outbox.length === 0 ? (
        <p className="lead">Nothing sent yet. Approved replies appear here.</p>
      ) : (
        outbox.map((o, i) => (
          <div key={i} className="email" style={{ marginBottom: 12 }}>
            <div className="subj">{o.id} to {o.to}</div>
            <div className="small" style={{ marginBottom: 8 }}>Sent at {o.t}{o.edited ? ", edited by the reviewer" : ", unedited"}</div>
            {o.text}
          </div>
        ))
      )}
    </div>
  );
}
