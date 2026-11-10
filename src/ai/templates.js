// Backups for when the AI is off or unavailable, so the demo never breaks.

import { fmt, money } from "../lib/dates.js";

// What the email-reading step would return, saved in advance.
export const FALLBACK_READINGS = {
  "DSP-1041": { claim: "closure", reason: "Terminal was closed Oct 3–4, so the container couldn't be collected.", ask: "Adjust the invoice", confidence: "high" },
  "DSP-1043": { claim: "missing_info", reason: "Invoice doesn't show availability or free-time dates.", ask: "Send the dates or cancel", confidence: "high" },
  "DSP-1036": { claim: "late_invoice", reason: "Invoice arrived more than a month after the empty was returned.", ask: "Review before paying", confidence: "high" },
  "DSP-1029": { claim: "goodwill", reason: "Their warehouse was full, so they couldn't collect sooner.", ask: "Waive the charge", confidence: "high" },
  "DSP-1047": { claim: "wrong_dates", reason: "Their trucker picked up on Oct 12, not Oct 14.", ask: "Correct the invoice", confidence: "high" },
  "DSP-1050": { claim: "wrong_party", reason: "They're the trucker; the cargo owner is Meridian Tools.", ask: "Bill Meridian Tools instead", confidence: "high" },
};

export const firstName = (c) => c.dispute.from.split(" ")[0];

// A fill-in-the-blanks reply for each outcome.
export function templateDraft(c, r) {
  const hi = `Hi ${firstName(c)},\n\nThank you for your note about ${c.invoice.no} (container ${c.container}).`;
  const sign = "\n\nKind regards,\nUS D&D Disputes Team";
  const bodies = {
    PARTIAL: ` We checked the records and confirmed the terminal was closed on ${c.closures.map(fmt).join(" and ")}. Those days shouldn't have been charged. We'll credit ${money(-r.rec.adjust)}, so the invoice total becomes ${money(r.calcT.amount)}.`,
    CANCEL: " After reviewing it, we're cancelling this invoice in full. No payment is needed.",
    REISSUE:
      c.billed.type === "motor_carrier"
        ? " We're withdrawing this invoice. You don't need to take any action."
        : " You're right that some dates were missing. We'll send a corrected invoice that shows them.",
    DECLINE: ` We received your request on ${fmt(c.dispute.received)}, after the dispute window for an invoice issued on ${fmt(c.invoice.issued)}. The charge matches our records, so we can't waive it. If you have information we haven't seen, reply to this email and we'll look again.`,
    REVIEW: ` Our commercial team is reviewing who should be billed for this move. We'll reply by ${fmt(r.due)}.`,
    ESCALATE: ` We're reviewing the gate records for this container and will reply by ${fmt(r.due)}.`,
    UPHOLD: " We reviewed the records and the charge is correct, so the invoice stands.",
  };
  const issues = r.findings.filter((f) => !f.ok || f.warn).map((f) => `${f.title}. ${f.refs.map((x) => `[${x}]`).join(" ")}`);
  const note = issues.length ? issues.join(" ") : "All checks passed. [E2] [E5] [E8]";
  return { internal_note: `${r.rec.label}. ${note}`, customer_reply: hi + bodies[r.rec.code] + sign };
}
