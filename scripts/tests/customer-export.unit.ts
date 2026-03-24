import assert from "node:assert/strict";
import { buildCustomerExport } from "@/lib/customer-export";

function run() {
  const now = new Date("2026-03-24T00:00:00.000Z");
  const { rows, columns } = buildCustomerExport([
    {
      name: "Rishabh Goswami",
      email: "rishabh@example.com",
      phone: "+919911111111",
      phoneSecondary: "+919922222222",
      address: "104, Azad Nagar",
      city: "Moradabad",
      state: "UP",
      country: "India",
      pincode: "244001",
      pan: "ABCDE1234F",
      gstin: "09AAJCK8115C1ZL",
      notes: "VIP",
      createdAt: now,
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Secondary Phone"], "+919922222222");
  assert.ok(columns.find((c) => c.header === "Secondary Phone"));
  assert.ok(columns.find((c) => c.header === "Created At"));

  console.log("customer-export.unit.ts passed");
}

run();

