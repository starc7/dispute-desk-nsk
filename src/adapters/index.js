// The adapter layer: one "plug" per company system.
// Every adapter has the same shape: some details for the Connected systems
// screen, plus async read functions. Today each reads the mock data.
// In a pilot you replace the body of one function with a real API call,
// and nothing else in the app has to change.

import * as db from "../data/mockSystems.js";
import { sleep } from "../lib/dates.js";

const latency = () => sleep(80 + Math.random() * 120); // pretend network delay
const copy = (x) => JSON.parse(JSON.stringify(x)); // never hand out the original object

function notFound(system, key) {
  throw new Error(`${system}: no record for ${key}`);
}

export const inbox = {
  key: "inbox",
  name: "Shared dispute inbox",
  reads: "Customer emails",
  access: "Read only",
  mode: "mock",
  pilot: "Mail API, read-only access to one mailbox",
  async listOpen() {
    await latency();
    return copy(db.inbox);
  },
  async get(disputeId) {
    await latency();
    // Real version, for example:
    // const res = await fetch(`${MAIL_API}/messages?disputeId=${disputeId}`, { headers: { Authorization: token } });
    const m = db.inbox.find((x) => x.disputeId === disputeId);
    return m ? copy(m) : notFound("Inbox", disputeId);
  },
};

export const billing = {
  key: "billing",
  name: "Billing system",
  reads: "Invoice, line items, billed party",
  access: "Read only",
  mode: "mock",
  pilot: "Read-only API, or a nightly export to start",
  async getInvoice(invoiceNo) {
    await latency();
    return db.billing[invoiceNo] ? copy(db.billing[invoiceNo]) : notFound("Billing", invoiceNo);
  },
};

export const terminal = {
  key: "terminal",
  name: "Terminal events",
  reads: "Availability and gate times",
  access: "Read only",
  mode: "mock",
  pilot: "The terminal feed operations already receives",
  async getEvents(container) {
    await latency();
    return db.terminalEvents[container] ? copy(db.terminalEvents[container]) : notFound("Terminal", container);
  },
};

export const carrier = {
  key: "carrier",
  name: "Carrier container events",
  reads: "Our own event history",
  access: "Read only",
  mode: "mock",
  pilot: "Internal events API",
  async getEvents(container) {
    await latency();
    return db.carrierEvents[container] ? copy(db.carrierEvents[container]) : notFound("Carrier events", container);
  },
};

export const tariff = {
  key: "tariff",
  name: "Tariff and free time",
  reads: "Free days, daily rate",
  access: "Read only",
  mode: "mock",
  pilot: "Tariff table export",
  async get(code) {
    await latency();
    return db.tariffs[code] ? copy(db.tariffs[code]) : notFound("Tariff", code);
  },
};

export const portNotices = {
  key: "portNotices",
  name: "Port notices",
  reads: "Closures and weather",
  access: "Read only",
  mode: "mock",
  pilot: "Operations notices list",
  // Returns closures at a port between two dates (inclusive).
  async list(port, from, to) {
    await latency();
    return copy((db.portNotices[port] || []).filter((n) => n.date >= from && n.date <= to));
  },
};

export const ALL_ADAPTERS = [inbox, billing, terminal, carrier, tariff, portNotices];
