// The agent: six steps in a fixed order.
// Two steps use AI (read the email, draft the reply). Four are plain code.
// onStep updates the progress list on screen; onData shares results as they arrive.

import { callClaude } from "../ai/client.js";
import { EXTRACT_SYSTEM, DRAFT_SYSTEM } from "../ai/prompts.js";
import { FALLBACK_READINGS, templateDraft, firstName } from "../ai/templates.js";
import { loadCaseFile } from "./caseFile.js";
import { evaluate, buildEvidence } from "../engine/evaluate.js";
import { checkDraft } from "../engine/guardrails.js";
import { inbox } from "../adapters/index.js";
import { fmt, money, sleep } from "../lib/dates.js";

export const STEP_DEFS = [
  { label: "Read the customer's email", kind: "ai" },
  { label: "Pull records from 6 systems", kind: "code" },
  { label: "Recalculate the charge", kind: "code" },
  { label: "Check the FMC rules", kind: "code" },
  { label: "Draft the reply", kind: "ai" },
  { label: "Check the draft", kind: "code" },
];

export async function runPipeline({ disputeId, rules, aiMode, onStep, onData }) {
  let aiMs = 0, tokens = 0, fallback = false, model = null, aiCalls = 0;
  const live = aiMode === "live";

  // Step 1 (AI): read the email.
  onStep(0, { state: "running" });
  const msg = await inbox.get(disputeId);
  let extract;
  if (live) {
    try {
      const out = await callClaude(EXTRACT_SYSTEM, `Subject: ${msg.subject}\n\n${msg.body}`);
      extract = out.json;
      aiMs += out.ms; tokens += out.tokens; model = out.model; aiCalls++;
      onStep(0, { state: "done", note: `${out.ms} ms` });
    } catch (e) {
      fallback = true;
      extract = FALLBACK_READINGS[disputeId];
      onStep(0, { state: "done", note: `AI unavailable (${e.message}). Used the saved reading.` });
    }
  } else {
    await sleep(300);
    extract = FALLBACK_READINGS[disputeId];
    onStep(0, { state: "done", note: "Offline mode, saved reading" });
  }
  onData({ extract });

  // Step 2 (code): pull records through the adapters.
  onStep(1, { state: "running" });
  const { caseFile, trace } = await loadCaseFile(disputeId);
  const slowest = Math.max(...trace.map((t) => t.ms));
  onData({ caseFile, evidence: buildEvidence(caseFile), trace });
  onStep(1, { state: "done", note: `${trace.length} systems, slowest ${slowest} ms (mock adapters)` });

  // Steps 3 and 4 (code): recalculate and check the rules.
  onStep(2, { state: "running" });
  const result = evaluate(caseFile, rules);
  await sleep(150);
  onStep(2, {
    state: "done",
    note: result.conflict ? "Two answers, records disagree" : `${result.calcT.days} chargeable days, ${money(result.calcT.amount)}`,
  });
  onStep(3, { state: "running" });
  await sleep(150);
  onData({ result });
  onStep(3, { state: "done", note: `${result.findings.filter((f) => f.rule).length} rule checks, ${rules.short}` });

  // Step 5 (AI): draft the reply from the facts the code produced.
  onStep(4, { state: "running" });
  let draft;
  if (live && !fallback) {
    try {
      const payload = {
        customer: caseFile.customer,
        contact_first_name: firstName(caseFile),
        invoice: caseFile.invoice.no,
        container: caseFile.container,
        charge_type: caseFile.chargeType,
        recommendation: { decision: result.rec.label, why: result.rec.summary },
        reply_due: fmt(result.due),
        findings: result.findings.map((f) => ({
          result: f.warn ? "needs review" : f.ok ? "pass" : "fail",
          title: f.title,
          detail: f.detail,
          evidence: f.refs,
        })),
        evidence: result.evidence.map((e) => ({ id: e.id, fact: `${e.label}: ${e.value}`, source: e.source })),
        allowed_dollar_amounts: [...result.amounts].map(money),
      };
      const out = await callClaude(DRAFT_SYSTEM, JSON.stringify(payload, null, 2));
      draft = out.json;
      aiMs += out.ms; tokens += out.tokens; model = out.model || model; aiCalls++;
      onStep(4, { state: "done", note: `${out.ms} ms` });
    } catch (e) {
      fallback = true;
      draft = templateDraft(caseFile, result);
      onStep(4, { state: "done", note: `AI unavailable (${e.message}). Used a template.` });
    }
  } else {
    await sleep(300);
    draft = templateDraft(caseFile, result);
    onStep(4, { state: "done", note: fallback ? "Template, AI was unavailable" : "Offline mode, template" });
  }

  // Step 6 (code): check the draft before a person can send it.
  onStep(5, { state: "running" });
  await sleep(120);
  const checks = checkDraft(draft.internal_note, draft.customer_reply, result);
  onStep(5, { state: "done", note: checks.every((c) => c.ok) ? "All checks passed" : "A check failed, send is locked" });

  return { extract, caseFile, result, draft, checks, meta: { aiMs, tokens, fallback, mode: aiMode, model, aiCalls } };
}
