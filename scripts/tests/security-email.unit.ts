import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderOtpEmail, renderSignInVerifiedEmail } from "@/lib/security/otp-email";
import { formatRecoveryExport } from "@/lib/security/recovery-export";

const fixture = { code: "012345", account: "admin@example.test", reference: "request-preview", context: { browser: "Chrome 130.0", os: "Windows 11", ip: "203.0.113.42", location: "Jaipur, Rajasthan, India", time: "27 October 2026, 4:30 pm IST" } };
for (const kind of ["sign-in", "settings", "mailbox-change", "recovery", "authenticator-setup"] as const) {
  const email = renderOtpEmail({ ...fixture, kind });
  assert.match(email.subject, /verification code/);
  assert.match(email.html, />012345<\/div>/, "OTP remains contiguous text, including leading zeros");
  assert.match(email.html, /5 minutes/);
  assert.match(email.html, /Jaipur/);
  assert.match(email.html, /Windows 11/);
  assert.match(email.html, /admin@example.test/);
  assert.match(email.text, /012345/);
  assert.doesNotMatch(email.subject, /012345/, "OTP is not exposed in subject headers");
  assert.doesNotMatch(email.html, /<script|<form|<button|javascript:|onclick=/i, "email must not depend on unsupported interactive copy scripts");
  assert.match(email.html, /KHYATIGEMS_Luxury_Gemstone_Banner_agficv.png/, "uses the established company email banner");
  assert.equal((email.html.match(/<img /g) || []).length, 1, "only the brand banner is loaded; no tracking pixels");
}
const escaped = renderOtpEmail({ ...fixture, kind: "sign-in", account: '<img src=x onerror="alert(1)">', context: { ...fixture.context, browser: "<script>attack</script>" } });
assert.doesNotMatch(escaped.html, /<img src=x|<script>/);
assert.match(escaped.html, /&lt;img/);
assert.throws(() => renderOtpEmail({ ...fixture, kind: "sign-in", code: "12 3456" }));
const codes = ["112233445566778899aabbcc", "ffeeddccbbaa998877665544"];
const exported = formatRecoveryExport(codes, fixture.account);
assert.match(exported, /Account: admin@example.test/);
assert.match(exported, /1\. 112233445566778899aabbcc/);
assert.match(exported, /2\. ffeeddccbbaa998877665544/);
assert.match(exported, /Each code works once/);
mkdirSync("output/security", { recursive: true });
writeFileSync("output/security/otp-email-preview.html", renderOtpEmail({ ...fixture, kind: "sign-in" }).html);
console.log("OTP email template checks passed: all purposes, HTML escaping, selectable leading-zero code, context, no scripts/tracking and recovery export.");

for (const recovered of [false, true]) {
  const notice = renderSignInVerifiedEmail({ ...fixture, recovered });
  assert.match(notice.html, /KHYATIGEMS_Luxury_Gemstone_Banner_agficv.png/);
  assert.match(notice.html, /SIGN-IN DETAILS/);
  assert.match(notice.html, /203.0.113.42/);
  assert.match(notice.text, /contact your ERP administrator immediately/);
  assert.match(notice.text, recovered ? /cannot be used again/ : /no action is needed/);
  assert.doesNotMatch(notice.html, /012345|class="otp-value"|<script|<button|onclick=/);
  const hostile = renderSignInVerifiedEmail({ ...fixture, account: '<script>alert(1)</script>', recovered });
  assert.doesNotMatch(hostile.html, /<script>/);
  assert.match(hostile.html, /&lt;script&gt;/);
  writeFileSync(`output/security/${recovered ? "recovery-sign-in" : "sign-in-verified"}-email-preview.html`, notice.html);
}
console.log("Sign-in notification checks passed: email and recovery verification, branded HTML, context, guidance and escaping.");

const appNotice = renderSignInVerifiedEmail({ ...fixture, authenticator: true });
assert.match(appNotice.html, /Password \+ authenticator app/);
assert.match(appNotice.text, /authenticator app verification/);
