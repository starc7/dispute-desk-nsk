// The rules engine. Plain code, no AI.
// It counts days, checks the FMC deadlines, compares our records
// and recommends an outcome. Same input always gives the same answer.

import { DEMO_TODAY, diff, addDays, fmt, money, toMs } from "../lib/dates.js";
import { FIELD_LABELS, TYPE_LABEL } from "../config/rules.js";

// Every fact gets an ID (E1, E2...) and a source system,
// so the AI's note and the reviewer can point to exactly where it came from.
export function buildEvidence(c) {
  return [
    { id: "E1", label: "Dispute received", value: fmt(c.dispute.received), source: "Shared dispute inbox" },
    { id: "E2", label: "Invoice issued", value: `${c.invoice.no} on ${fmt(c.invoice.issued)}`, source: "Billing system" },
    { id: "E3", label: "Last charge date", value: fmt(c.invoice.lastCharge), source: "Billing system" },
    { id: "E4", label: c.startLabel, value: fmt(c.start), source: "Terminal events" },
    { id: "E5", label: `${c.endLabel}, terminal record`, value: fmt(c.endTerminal), source: "Terminal events" },
    { id: "E6", label: `${c.endLabel}, carrier record`, value: fmt(c.endCarrier), source: "Carrier container events" },
    { id: "E7", label: "Closures", value: c.closures.length ? `${c.closures.map(fmt).join(", ")} (${c.closureNote})` : "None reported", source: "Port notices" },
    { id: "E8", label: "Free time and rate", value: `${c.freeDays} days free, ${money(c.rate)} per day`, source: "Tariff and free time" },
    {
      id: "E9",
      label: "Billed party",
      value: `${c.billed.name} (${TYPE_LABEL[c.billed.type]})${c.invoice.basisText ? `. Basis: ${c.invoice.basisText}` : ""}`,
      source: "Billing system",
    },
  ];
}

// Chargeable days = days on the clock, minus free days, minus closure days.
export function calcCharge(c, end) {
  const elapsed = diff(c.start, end);
  const closed = c.closures.filter((d) => toMs(d) >= toMs(c.start) && toMs(d) < toMs(end)).length;
  const days = Math.max(0, elapsed - c.freeDays - closed);
  return { elapsed, closed, days, amount: days * c.rate };
}

export function evaluate(c, rules, today = DEMO_TODAY) {
  const evidence = buildEvidence(c);
  const findings = [];

  // 1. Was the invoice sent within 30 days of the last charge? (§541.7)
  const issueLag = diff(c.invoice.lastCharge, c.invoice.issued);
  const issuedOnTime = issueLag <= rules.issueDays;
  findings.push({
    ok: issuedOnTime,
    title: issuedOnTime ? "Invoice sent on time" : "Invoice sent late",
    detail: `Issued ${issueLag} days after the last charge. The limit is ${rules.issueDays}.`,
    refs: ["E2", "E3"],
    rule: "§541.7",
  });

  // 2. Does the invoice have every required detail? (§541.5)
  const missing = rules.requiredFields.filter((k) => c.invoice.missing.includes(k));
  findings.push({
    ok: missing.length === 0,
    title: missing.length ? "Invoice is missing required details" : "Invoice has every required detail",
    detail: missing.length
      ? `Missing: ${missing.map((k) => FIELD_LABELS[k].toLowerCase()).join(", ")}.`
      : `All ${rules.requiredFields.length} required details are present.`,
    refs: ["E2"],
    rule: "§541.5",
  });

  // 3. Was it sent to a party the rule allows? (§541.4, only in the old rule)
  let partyOk = true;
  let partyReview = false;
  if (rules.restrictBilledParty) {
    partyOk = c.billed.type !== "motor_carrier";
    findings.push({
      ok: partyOk,
      title: partyOk ? "Sent to a party the rule allows" : "Sent to a party the rule doesn't allow",
      detail: partyOk
        ? `${c.billed.name} is the ${TYPE_LABEL[c.billed.type]}.`
        : `Under this rule version a motor carrier can't be billed. The cargo owner is ${c.cargoOwner}.`,
      refs: ["E9"],
      rule: "§541.4",
    });
  } else if (c.billed.type === "motor_carrier") {
    partyReview = true;
    findings.push({
      ok: true,
      warn: true,
      title: "Billing the trucker is allowed again, needs a person",
      detail: `§541.4 no longer applies, and the invoice states why the trucker is liable (${c.invoice.basisText}). Commercial should confirm.`,
      refs: ["E9"],
      rule: "§541.4 removed",
    });
  }

  // 4. Did the customer dispute in time? (§541.8)
  const disputeLag = diff(c.invoice.issued, c.dispute.received);
  const disputeOnTime = disputeLag <= rules.disputeDays;
  findings.push({
    ok: disputeOnTime,
    title: disputeOnTime ? "Dispute filed in time" : "Dispute filed after the window",
    detail: `Filed ${disputeLag} days after the invoice. The window is ${rules.disputeDays} days.`,
    refs: ["E1", "E2"],
    rule: "§541.8",
  });

  // 5. Do our own systems agree?
  const conflict = c.endTerminal !== c.endCarrier;
  findings.push({
    ok: !conflict,
    title: conflict ? "Our own systems disagree" : "Terminal and carrier records agree",
    detail: conflict
      ? `Terminal says ${fmt(c.endTerminal)}, carrier system says ${fmt(c.endCarrier)}. That's a ${Math.abs(diff(c.endTerminal, c.endCarrier))}-day gap.`
      : `Both show ${fmt(c.endTerminal)}.`,
    refs: ["E5", "E6"],
  });

  // 6. Recalculate the charge.
  const calcT = calcCharge(c, c.endTerminal);
  const calcC = calcCharge(c, c.endCarrier);
  let overcharge = 0;
  if (!conflict) {
    overcharge = c.invoice.amount - calcT.amount;
    findings.push({
      ok: overcharge <= 0,
      title: overcharge > 0 ? `Invoice overcharges by ${money(overcharge)}` : "Charge matches our records",
      detail: `${calcT.elapsed} days, minus ${c.freeDays} free days${calcT.closed ? ` and ${calcT.closed} closure days` : ""}, leaves ${calcT.days} chargeable days at ${money(c.rate)} = ${money(calcT.amount)}. The invoice says ${c.invoice.days} days, ${money(c.invoice.amount)}.`,
      refs: ["E4", "E5", "E7", "E8"],
    });
  } else {
    findings.push({
      ok: false,
      warn: true,
      title: "Two possible charges",
      detail: `Terminal record gives ${calcT.days} days (${money(calcT.amount)}). Carrier record gives ${calcC.days} days (${money(calcC.amount)}). The invoice used the carrier record.`,
      refs: ["E4", "E5", "E6", "E8"],
    });
  }

  // Deadlines.
  const due = addDays(c.dispute.received, rules.respondDays);
  const reissueBy = addDays(c.invoice.lastCharge, rules.issueDays);
  const reissueLeft = diff(today, reissueBy);
  const cancel = (why) => ({ code: "CANCEL", label: "Cancel the invoice", summary: why, adjust: -c.invoice.amount });

  // Recommendation. Order matters: the most serious problem decides.
  let rec;
  if (conflict) {
    rec = { code: "ESCALATE", label: "Escalate to a person", summary: "Our own records disagree, so the agent won't pick a number.", adjust: 0 };
  } else if (!issuedOnTime) {
    rec = cancel(`It went out ${issueLag} days after the last charge, past the ${rules.issueDays}-day limit. The customer doesn't have to pay it.`);
  } else if (missing.length) {
    rec =
      reissueLeft >= 0
        ? { code: "REISSUE", label: "Reissue with the missing details", summary: `The corrected invoice must go out by ${fmt(reissueBy)} (${reissueLeft} days left).`, adjust: 0 }
        : cancel(`It's missing required details, and the window to reissue closed on ${fmt(reissueBy)}.`);
  } else if (!partyOk) {
    rec =
      reissueLeft >= 0
        ? { code: "REISSUE", label: `Withdraw and reissue to ${c.cargoOwner}`, summary: `The new invoice must go out by ${fmt(reissueBy)} (${reissueLeft} days left).`, adjust: 0 }
        : cancel(`It was sent to the wrong party, and the window to reissue closed on ${fmt(reissueBy)}.`);
  } else if (!disputeOnTime) {
    rec = { code: "DECLINE", label: "Decline: dispute filed late", summary: `Filed ${disputeLag} days after the invoice. The charge itself matches our records.`, adjust: 0 };
  } else if (overcharge > 0) {
    rec = { code: "PARTIAL", label: `Waive ${money(overcharge)}`, summary: `The correct charge is ${money(calcT.amount)}, not ${money(c.invoice.amount)}.`, adjust: -overcharge };
  } else if (partyReview) {
    rec = { code: "REVIEW", label: "Uphold, with commercial review", summary: "The charge matches our records. Billing a trucker is allowed again, but it's a relationship call.", adjust: 0 };
  } else {
    rec = { code: "UPHOLD", label: "Uphold the charge", summary: "The invoice is compliant and matches our records.", adjust: 0 };
  }

  // The only dollar amounts the AI is allowed to write in a reply.
  const amounts = new Set([c.invoice.amount, calcT.amount, calcC.amount, Math.abs(rec.adjust)].filter((n) => n > 0));
  return { evidence, findings, rec, due, conflict, calcT, calcC, amounts, rulesId: rules.id };
}
