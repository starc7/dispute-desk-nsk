// Gathers everything about one dispute from the six systems
// and joins it into one "case file" the rules engine can read.

import { inbox, billing, terminal, carrier, tariff, portNotices } from "../adapters/index.js";

// Time one adapter call so we can show it in the agent's steps.
async function timed(trace, adapter, fn) {
  const t0 = Date.now();
  const out = await fn();
  trace.push({ system: adapter.name, ms: Date.now() - t0 });
  return out;
}

export async function loadCaseFile(disputeId) {
  const trace = [];
  const msg = await timed(trace, inbox, () => inbox.get(disputeId));
  const inv = await timed(trace, billing, () => billing.getInvoice(msg.invoiceNo));
  // These three don't depend on each other, so fetch them at the same time.
  const [term, carr, tar] = await Promise.all([
    timed(trace, terminal, () => terminal.getEvents(inv.container)),
    timed(trace, carrier, () => carrier.getEvents(inv.container)),
    timed(trace, tariff, () => tariff.get(inv.tariffCode)),
  ]);
  const notices = await timed(trace, portNotices, () => portNotices.list(inv.port, term.start, term.end));
  return { caseFile: buildCaseFile(msg, inv, term, carr, tar, notices), trace };
}

export function buildCaseFile(msg, inv, term, carr, tar, notices) {
  return {
    id: msg.disputeId,
    customer: inv.customer,
    billed: inv.billed,
    cargoOwner: inv.cargoOwner,
    chargeType: inv.chargeType,
    bl: inv.bl,
    container: inv.container,
    port: inv.port,
    freeDays: tar.freeDays,
    rate: tar.rate,
    start: term.start,
    startLabel: term.startLabel,
    endTerminal: term.end,
    endCarrier: carr.end,
    endLabel: term.endLabel,
    closures: notices.map((n) => n.date),
    closureNote: notices[0]?.note || "",
    invoice: {
      no: inv.no,
      issued: inv.issued,
      lastCharge: inv.lastCharge,
      days: inv.days,
      amount: inv.amount,
      missing: inv.missing,
      basisText: inv.basisText,
    },
    dispute: { received: msg.received, from: msg.from, subject: msg.subject, body: msg.body },
  };
}

export async function loadAllCases() {
  const open = await inbox.listOpen();
  const files = await Promise.all(open.map((m) => loadCaseFile(m.disputeId)));
  return files.map((f) => f.caseFile);
}
