import type { requestContext } from "./core";

type OtpEmail = {
  kind: "sign-in" | "settings" | "mailbox-change" | "recovery";
  code: string;
  account: string;
  reference: string;
  context: ReturnType<typeof requestContext>;
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const content = {
  "sign-in": { title: "Confirm your sign-in", subject: "Your sign-in verification code", description: "A correct password was entered for your ERP account. Use this one-time code to finish signing in.", warning: "If you did not try to sign in, do not share this code. Contact your ERP administrator and review your password." },
  settings: { title: "Confirm your security settings", subject: "Your security settings verification code", description: "Use this one-time code to confirm the security settings you requested for your ERP account.", warning: "If you did not request this change, do not share this code. Your security settings will not change without verification." },
  "mailbox-change": { title: "Approve a mailbox change", subject: "Your mailbox change verification code", description: "A change to the ERP verification mailbox was requested. Use this code to approve the change from your current mailbox.", warning: "Only approve a mailbox change you requested. If this was not you, do not share this code and contact your ERP administrator." },
  recovery: { title: "Protect your recovery access", subject: "Your recovery codes verification code", description: "Use this one-time code to generate a new set of recovery codes for your ERP account. This replaces your previous set.", warning: "If you did not request new recovery codes, do not share this code. Your existing recovery codes remain unchanged until verification." },
};

/** Email-safe tables and inline CSS. The OTP is one selectable text node, never an image. */
export function renderOtpEmail(input: OtpEmail) {
  if (!/^\d{6}$/.test(input.code)) throw new Error("OTP email requires a six-digit code");
  const copy = content[input.kind];
  const rows = [
    ["Account", input.account], ["Time", input.context.time],
    ["Browser", input.context.browser], ["Operating system", input.context.os],
    ["IP address", input.context.ip], ["Approx. location", input.context.location],
  ];
  const text = `${copy.title}\n\n${copy.description}\n\n${input.kind === "mailbox-change" ? "Current-mailbox confirmation code" : "Code"}: ${input.code}\nExpires in 5 minutes. This code can be used once.\n\n${rows.map(([label, value]) => `${label === "Browser" ? "Browser (reported)" : label === "Operating system" ? "OS (reported)" : label === "IP address" ? "IP" : label === "Approx. location" ? "Approximate location" : label}: ${value}`).join("\n")}\nReference: ${input.reference}\n\n${copy.warning}\n\nReturn to the ERP page where you requested this code. Never share it with anyone.\nBrowser and OS are reported by the device. Location is approximate and may reflect a VPN.\n\nKhyatiGems ERP · Security notification`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(copy.subject)}</title>
<style>@media only screen and (max-width:480px){.email-shell{padding:16px 8px!important}.email-content{padding:28px 22px!important}.email-title{font-size:27px!important}.otp-value{font-size:38px!important;letter-spacing:7px!important}.details-label{width:104px!important;font-size:12px!important}.details-value{font-size:12px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#f3f1ec;color:#182536;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:#f3f1ec;font-size:1px">Your one-time verification code for KhyatiGems ERP. Valid for 5 minutes.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f1ec"><tr><td class="email-shell" align="center" style="padding:36px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;width:100%;border:1px solid #e5e0d5;border-radius:16px;overflow:hidden;background-color:#ffffff">
<tr><td style="height:4px;background-color:#b7985b;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px 32px;background-color:#132132;border-bottom:1px solid #273548">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td><div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;letter-spacing:2px;font-weight:normal;color:#efdfb8">KHYATI GEMS</div><div style="padding-top:7px;font-size:10px;letter-spacing:2.5px;color:#c5cbd2">ENTERPRISE WORKSPACE</div></td><td align="right" style="font-size:10px;letter-spacing:1.5px;color:#e2c990;vertical-align:middle">SECURE<br><span style="line-height:22px">ACCESS</span></td></tr></table>
</td></tr>
<tr><td class="email-content" style="padding:36px 36px 32px">
<p style="margin:0 0 12px;font-size:10px;font-weight:bold;letter-spacing:2px;color:#94713b">ACCOUNT VERIFICATION</p>
<h1 class="email-title" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;font-weight:normal;color:#132132">${escapeHtml(copy.title)}</h1>
<p style="margin:0 0 26px;font-size:14px;line-height:1.75;color:#5b6572">${escapeHtml(copy.description)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e9dfca;border-radius:12px;background-color:#faf7ef"><tr><td align="center" style="padding:24px 12px 22px">
<p style="margin:0 0 14px;font-size:11px;line-height:1.5;color:#736045">Your verification code</p>
<div class="otp-value" dir="ltr" style="font-family:'Courier New',Courier,monospace;font-size:44px;font-weight:bold;line-height:1.3;letter-spacing:9px;color:#132132;white-space:nowrap;user-select:all;-webkit-user-select:all">${input.code}</div>
<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#806b48">Valid for <strong>5 minutes</strong> &nbsp;·&nbsp; Single use</p>
</td></tr></table>
<p style="margin:14px 0 28px;text-align:center;font-size:12px;line-height:1.6;color:#747b85">Select the code to copy it, then return to your ERP page.</p>
<p style="margin:0 0 12px;font-size:10px;font-weight:bold;letter-spacing:1.7px;color:#7d8792">REQUEST DETAILS</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;border-top:1px solid #eceef0">
${rows.map(([label, value]) => `<tr><td class="details-label" width="130" style="width:130px;padding:11px 10px 11px 0;border-bottom:1px solid #eceef0;font-size:12px;line-height:1.6;color:#7a8490;vertical-align:top">${escapeHtml(label)}</td><td class="details-value" style="padding:11px 0;border-bottom:1px solid #eceef0;font-size:13px;line-height:1.6;color:#263445;vertical-align:top;word-break:break-all;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join("\n")}
</table>
<p style="margin:12px 0 24px;font-size:10px;line-height:1.7;color:#9098a1">Browser and OS are reported by the device. Location is approximate and may reflect a VPN.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7fa;border-left:3px solid #b7985b;border-radius:0 8px 8px 0"><tr><td style="padding:16px 18px"><p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#263445">Keep this code private</p><p style="margin:0;font-size:12px;line-height:1.75;color:#66717e">${escapeHtml(copy.warning)}</p></td></tr></table>
<p style="margin:24px 0 0;font-size:10px;line-height:1.6;color:#8b949f;word-break:break-all">Request reference: ${escapeHtml(input.reference)}</p>
</td></tr></table>
<p style="max-width:460px;margin:22px auto 0;font-size:11px;line-height:1.8;color:#8a9097;text-align:center">KHYATI GEMS &nbsp;·&nbsp; ERP SECURITY<br>This is an automated security email. We will never ask you to share your code.</p>
</td></tr></table></body></html>`;
  return { subject: copy.subject, text, html };
}
