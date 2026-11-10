// Talks to OUR server (/api/claude), never to Claude directly.
// The server holds the API key, so the browser never sees it.

export async function getHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { ok: false, aiConfigured: false, model: null };
  }
}

export async function callClaude(system, user) {
  const t0 = performance.now();
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);

  // We asked for JSON only, but strip code fences just in case, then parse.
  const clean = (data.text || "").replace(/```json|```/g, "").trim();
  const json = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { json, ms: Math.round(performance.now() - t0), tokens, model: data.model };
}
