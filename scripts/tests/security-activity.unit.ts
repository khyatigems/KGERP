import assert from "node:assert/strict";
import { presentActivity, securityRequestDetails } from "@/lib/security/activity";

const account = { name: "Akansh Gautam", email: "admin@khyatigems.com" };
const legacy = { entityType: "Security", entityId: "account-uuid", userId: "account-uuid", referenceId: "account-uuid", userName: "Sign-in security", actionType: "LOGIN_OTP_VERIFIED", description: "LOGIN OTP VERIFIED" };
assert.deepEqual(presentActivity(legacy, account), {
  security: true, action: "LOGIN_OTP_VERIFIED", label: "Email code verified", reference: account.email, user: account.name,
  description: "The account passed email verification for sign-in.",
});
const snapshot = presentActivity({ ...legacy, userName: "Historical name", userEmail: "old@example.test", referenceId: "old@example.test", description: "Specific recorded detail" }, account);
assert.equal(snapshot.reference, "old@example.test");
assert.equal(snapshot.user, "Historical name");
assert.equal(snapshot.description, "Specific recorded detail");
assert.equal(presentActivity(legacy).reference, "Account no longer available");
assert.equal(presentActivity(legacy).user, "Unavailable account");
const inventory = presentActivity({ entityType: "Inventory", entityId: "uuid", entityIdentifier: "KG-123", userName: "Akansh", actionType: "STATUS_CHANGE", details: "Reserved for Sakshi" }, account);
assert.equal(inventory.reference, "KG-123");
assert.equal(inventory.description, "Reserved for Sakshi");
assert.equal(inventory.label, "STATUS_CHANGE");
assert.match(presentActivity({ ...legacy, actionType: "SECURITY_CHANGE_REQUESTED", description: "SECURITY CHANGE REQUESTED" }, account).description, /does not mean the change was saved/);
assert.deepEqual(securityRequestDetails('{"context":"Browser (reported): Chrome\\nIP: Unavailable"}'), ["Browser (reported): Chrome", "IP: Unavailable"]);
assert.deepEqual(securityRequestDetails("invalid JSON"), []);
assert.deepEqual(securityRequestDetails('{"context":null}'), []);
assert.deepEqual(securityRequestDetails("null"), []);
console.log("Security activity checks passed: legacy account resolution, snapshots, readable events, missing accounts, request details and unchanged inventory logs.");
