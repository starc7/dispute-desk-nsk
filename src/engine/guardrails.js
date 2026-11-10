// The guardrail: code checks the AI's draft before a person can send it.
// If any check fails, the Send button stays locked.

export function checkDraft(note, reply, result) {
  const ids = new Set(result.evidence.map((e) => e.id));

  // Every [E#] in the reviewer note must be a real piece of evidence.
  const refs = [...(note || "").matchAll(/\[(E\d+)\]/g)].map((m) => m[1]);
  const badRefs = refs.filter((r) => !ids.has(r));

  // Every dollar amount in the customer email must come from the calculation.
  const nums = [...(reply || "").matchAll(/\$\s?([\d,]+(?:\.\d{1,2})?)/g)].map((m) =>
    Math.round(parseFloat(m[1].replace(/,/g, "")))
  );
  const badNums = nums.filter((n) => !result.amounts.has(n));

  // Internal evidence IDs must not leak into the customer email.
  const leaked = /\[E\d+\]/.test(reply || "");

  const money = (n) => "$" + n.toLocaleString("en-US");
  return [
    {
      label: "Every fact in the note points to real evidence",
      ok: refs.length > 0 && badRefs.length === 0,
      detail: refs.length ? (badRefs.length ? `Unknown references: ${badRefs.join(", ")}` : `${refs.length} references, all valid`) : "No references found",
    },
    {
      label: "Dollar amounts match the calculation",
      ok: badNums.length === 0,
      detail: badNums.length ? `Not in our numbers: ${badNums.map(money).join(", ")}` : nums.length ? `${nums.map(money).join(", ")} verified` : "No amounts in the email",
    },
    { label: "No internal references in the customer email", ok: !leaked, detail: leaked ? "Remove the [E…] references" : "Clean" },
  ];
}
