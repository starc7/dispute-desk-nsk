// Automated checks for the rules engine and the guardrail.
// Run with: npm test
// These are the "evals" for the parts that must never be wrong.

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCaseFile } from "../agent/caseFile.js";
import { evaluate } from "./evaluate.js";
import { checkDraft } from "./guardrails.js";
import { RULES } from "../config/rules.js";

const EXPECTED = {
  // dispute: [outcome under May 2024 rule, outcome under current rule]
  "DSP-1041": ["PARTIAL", "PARTIAL"], // storm closure, overcharged 2 days
  "DSP-1043": ["CANCEL", "CANCEL"], // missing details, reissue window closed
  "DSP-1036": ["CANCEL", "CANCEL"], // invoice sent 34 days late
  "DSP-1029": ["DECLINE", "DECLINE"], // dispute filed after 41 days
  "DSP-1047": ["ESCALATE", "ESCALATE"], // our systems disagree
  "DSP-1050": ["REISSUE", "REVIEW"], // trucker billed: outcome changes with the rule
};

for (const [id, [oldCode, newCode]] of Object.entries(EXPECTED)) {
  test(`${id} gives ${oldCode} under the old rule and ${newCode} under the current rule`, async () => {
    const { caseFile } = await loadCaseFile(id);
    assert.equal(evaluate(caseFile, RULES["2024-05"]).rec.code, oldCode);
    assert.equal(evaluate(caseFile, RULES["2025-12"]).rec.code, newCode);
  });
}

test("Storm case: waives exactly $350", async () => {
  const { caseFile } = await loadCaseFile("DSP-1041");
  const r = evaluate(caseFile, RULES["2025-12"]);
  assert.equal(r.rec.adjust, -350);
  assert.equal(r.calcT.days, 2);
});

test("Guardrail blocks a dollar amount the code didn't calculate", async () => {
  const { caseFile } = await loadCaseFile("DSP-1041");
  const r = evaluate(caseFile, RULES["2025-12"]);
  const checks = checkDraft("Overcharged [E5] [E7].", "Hi Dana, we'll credit $999.", r);
  assert.equal(checks[1].ok, false);
});

test("Guardrail blocks evidence IDs that don't exist", async () => {
  const { caseFile } = await loadCaseFile("DSP-1041");
  const r = evaluate(caseFile, RULES["2025-12"]);
  const checks = checkDraft("Closed per [E42].", "Hi Dana, we'll credit $350.", r);
  assert.equal(checks[0].ok, false);
});

test("Guardrail passes a correct draft", async () => {
  const { caseFile } = await loadCaseFile("DSP-1041");
  const r = evaluate(caseFile, RULES["2025-12"]);
  const checks = checkDraft("Closed Oct 3-4 [E7], gate-out Oct 9 [E5].", "Hi Dana, we'll credit $350.", r);
  assert.ok(checks.every((c) => c.ok));
});
