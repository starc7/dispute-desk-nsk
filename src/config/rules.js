// The FMC billing rules (46 CFR Part 541) written as settings, not as AI instructions.
// When the law changes, you edit this file and every case is re-checked.

export const FIELD_LABELS = {
  bl: "B/L number",
  container: "Container number",
  port: "Port of discharge",
  basis: "Why the billed party is liable",
  freeTime: "Free time allowed",
  freeTimeEnd: "Free time start and end dates",
  availability: "Container availability date",
  chargeDates: "Dates charged",
  rate: "Rate and tariff rule",
  amount: "Amount due",
  issueDate: "Invoice issue date",
  disputeInfo: "How to dispute the charge",
  certification: "Compliance certification",
};
export const ALL_FIELDS = Object.keys(FIELD_LABELS);

export const RULES = {
  "2024-05": {
    id: "2024-05",
    label: "Original rule (May 2024)",
    short: "May 2024 rule",
    issueDays: 30, // invoice must go out within 30 days of the last charge (§541.7)
    disputeDays: 30, // customer gets at least 30 days to dispute (§541.8)
    respondDays: 30, // carrier must try to resolve within 30 days (§541.8)
    restrictBilledParty: true, // §541.4: only the contracting shipper or the consignee
    requiredFields: ALL_FIELDS, // §541.5: required invoice details
    note: "Includes §541.4, which limited invoices to the contracting shipper or the consignee.",
  },
  "2025-12": {
    id: "2025-12",
    label: "Current rule (§541.4 removed Dec 29, 2025)",
    short: "Current rule",
    issueDays: 30,
    disputeDays: 30,
    respondDays: 30,
    restrictBilledParty: false, // court set aside §541.4 in Sept 2025
    requiredFields: ALL_FIELDS,
    note: "A court set aside §541.4 in Sept 2025. Invoice content, timing and dispute rules still apply.",
  },
};

export const DEFAULT_RULES_ID = "2025-12";

export const TYPE_LABEL = { consignee: "consignee", shipper: "contracting shipper", motor_carrier: "motor carrier" };
