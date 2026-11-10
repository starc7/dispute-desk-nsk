// Synthetic data, split the way it would be split in a real company:
// each block below stands in for a different system with its own owner.
// Nothing here is real Maersk data.

// ---- Shared dispute inbox (emails) ----
export const inbox = [
  {
    disputeId: "DSP-1041",
    received: "2026-11-02",
    from: "Dana Ruiz, AP Manager",
    subject: "Dispute on INV-DD-55102: terminal was closed",
    invoiceNo: "INV-DD-55102", // linked when the email was logged as a dispute
    body:
      "Hi team,\n\nWe're disputing invoice INV-DD-55102 for container MSKU7034126. The terminal in Newark was shut on Oct 3 and 4 because of the wind advisory, so our trucker couldn't get in. We don't think we should pay demurrage for days the terminal was closed. Please adjust the invoice.\n\nThanks,\nDana Ruiz\nHalvorsen Home Goods",
  },
  {
    disputeId: "DSP-1043",
    received: "2026-11-03",
    from: "Marcus Lee, Logistics",
    subject: "Can't verify INV-DD-54877",
    invoiceNo: "INV-DD-54877",
    body:
      "Hello,\n\nInvoice INV-DD-54877 doesn't show when the container became available or when free time ended, so we can't check the 5 days you charged. Please send the dates or cancel the charge.\n\nRegards,\nMarcus Lee\nBrightline Apparel",
  },
  {
    disputeId: "DSP-1036",
    received: "2026-10-15",
    from: "Priya Shah, Finance",
    subject: "INV-DD-54210 arrived very late",
    invoiceNo: "INV-DD-54210",
    body:
      "Hi,\n\nWe returned the empty on Sep 10 and only got this detention invoice on Oct 14. That's over a month later. We'd like it reviewed before we pay.\n\nPriya Shah\nCedar Valley Foods",
  },
  {
    disputeId: "DSP-1029",
    received: "2026-10-31",
    from: "Tom Becker, Operations",
    subject: "Waiver request INV-DD-53660",
    invoiceNo: "INV-DD-53660",
    body:
      "Hi,\n\nWe'd like a waiver on INV-DD-53660. Our warehouse was full in early September so we couldn't take the container sooner. We've been a customer for years and hope you can help.\n\nTom Becker\nNorthgate Electronics",
  },
  {
    disputeId: "DSP-1047",
    received: "2026-11-04",
    from: "Ana Torres, Imports",
    subject: "Wrong dates on INV-DD-55240",
    invoiceNo: "INV-DD-55240",
    body:
      "Hello,\n\nINV-DD-55240 charges us through Oct 14, but our trucker picked up MSKU5521098 on Oct 12. We have the terminal gate ticket. Please correct the invoice.\n\nAna Torres\nPacific Rim Furniture",
  },
  {
    disputeId: "DSP-1050",
    received: "2026-11-05",
    from: "Joe Kowalski, Dispatch",
    subject: "INV-DD-55318 sent to the wrong company",
    invoiceNo: "INV-DD-55318",
    body:
      "Hi,\n\nWe're the trucking company on this move, not the cargo owner. Meridian Tools owns the freight. Please send INV-DD-55318 to them, not us.\n\nJoe Kowalski\nKeystone Drayage LLC",
  },
];

// ---- Billing system (invoices), keyed by invoice number ----
export const billing = {
  "INV-DD-55102": { no: "INV-DD-55102", customer: "Halvorsen Home Goods", billed: { name: "Halvorsen Home Goods", type: "consignee" }, chargeType: "Demurrage", bl: "MAEU238814551", container: "MSKU7034126", port: "Newark, NJ", tariffCode: "DEM-NWK-STD", issued: "2026-10-20", lastCharge: "2026-10-09", days: 4, amount: 700, missing: [] },
  "INV-DD-54877": { no: "INV-DD-54877", customer: "Brightline Apparel", billed: { name: "Brightline Apparel", type: "consignee" }, chargeType: "Demurrage", bl: "MAEU238901774", container: "MRKU4410982", port: "Savannah, GA", tariffCode: "DEM-SAV-STD", issued: "2026-10-15", lastCharge: "2026-10-06", days: 5, amount: 750, missing: ["freeTimeEnd", "availability"] },
  "INV-DD-54210": { no: "INV-DD-54210", customer: "Cedar Valley Foods", billed: { name: "Cedar Valley Foods", type: "shipper" }, chargeType: "Detention", bl: "MAEU237655120", container: "MSKU9902213", port: "Long Beach, CA", tariffCode: "DET-LGB-STD", issued: "2026-10-14", lastCharge: "2026-09-10", days: 7, amount: 840, missing: [] },
  "INV-DD-53660": { no: "INV-DD-53660", customer: "Northgate Electronics", billed: { name: "Northgate Electronics", type: "consignee" }, chargeType: "Demurrage", bl: "MAEU236120447", container: "MRKU2287450", port: "Houston, TX", tariffCode: "DEM-HOU-STD", issued: "2026-09-20", lastCharge: "2026-09-05", days: 4, amount: 800, missing: [] },
  "INV-DD-55240": { no: "INV-DD-55240", customer: "Pacific Rim Furniture", billed: { name: "Pacific Rim Furniture", type: "consignee" }, chargeType: "Demurrage", bl: "MAEU238455031", container: "MSKU5521098", port: "Oakland, CA", tariffCode: "DEM-OAK-STD", issued: "2026-10-25", lastCharge: "2026-10-14", days: 7, amount: 1260, missing: [] },
  "INV-DD-55318": { no: "INV-DD-55318", customer: "Keystone Drayage LLC", billed: { name: "Keystone Drayage LLC", type: "motor_carrier" }, cargoOwner: "Meridian Tools", basisText: "Merchant haulage agreement MHA-2291", chargeType: "Demurrage", bl: "MAEU238770312", container: "MRKU8830451", port: "Newark, NJ", tariffCode: "DEM-NWK-STD", issued: "2026-10-22", lastCharge: "2026-10-13", days: 4, amount: 700, missing: [] },
};

// ---- Terminal events, keyed by container ----
// start = when the clock starts (available for demurrage, picked up full for detention)
// end = when it stops (gate-out for demurrage, empty returned for detention)
export const terminalEvents = {
  MSKU7034126: { startLabel: "Container available", start: "2026-10-01", endLabel: "Gate-out", end: "2026-10-09" },
  MRKU4410982: { startLabel: "Container available", start: "2026-09-26", endLabel: "Gate-out", end: "2026-10-06" },
  MSKU9902213: { startLabel: "Picked up full", start: "2026-08-20", endLabel: "Empty returned", end: "2026-09-10" },
  MRKU2287450: { startLabel: "Container available", start: "2026-08-28", endLabel: "Gate-out", end: "2026-09-05" },
  MSKU5521098: { startLabel: "Container available", start: "2026-10-02", endLabel: "Gate-out", end: "2026-10-12" },
  MRKU8830451: { startLabel: "Container available", start: "2026-10-05", endLabel: "Gate-out", end: "2026-10-13" },
};

// ---- Carrier's own container events, keyed by container ----
// Note MSKU5521098: the carrier system says Oct 14, the terminal says Oct 12.
export const carrierEvents = {
  MSKU7034126: { end: "2026-10-09" },
  MRKU4410982: { end: "2026-10-06" },
  MSKU9902213: { end: "2026-09-10" },
  MRKU2287450: { end: "2026-09-05" },
  MSKU5521098: { end: "2026-10-14" },
  MRKU8830451: { end: "2026-10-13" },
};

// ---- Tariff and free time, keyed by tariff code ----
export const tariffs = {
  "DEM-NWK-STD": { freeDays: 4, rate: 175 },
  "DEM-SAV-STD": { freeDays: 5, rate: 150 },
  "DET-LGB-STD": { freeDays: 14, rate: 120 },
  "DEM-HOU-STD": { freeDays: 4, rate: 200 },
  "DEM-OAK-STD": { freeDays: 5, rate: 180 },
};

// ---- Port notices (closures), keyed by port ----
export const portNotices = {
  "Newark, NJ": [
    { date: "2026-10-03", note: "terminal closed, high-wind advisory" },
    { date: "2026-10-04", note: "terminal closed, high-wind advisory" },
  ],
};
