export const metadata = { title: "Work Tracker Extension Privacy | KhyatiGems" };
export default function ExtensionPrivacyPage() {
 return <main className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-sm leading-7">
  <h1 className="text-2xl font-semibold">KhyatiGems Work Tracker extension privacy</h1>
  <p>Updated 23 October 2026. This extension provides optional estimates of active marketplace work for your KhyatiGems ERP account.</p>
  <h2 className="text-lg font-semibold">Information used</h2>
  <p>When you enable tracking, the extension reads the active tab URL locally to identify supported eBay, Etsy and Amazon domains. It checks browser focus and Chrome idle or locked status. It sends supported domain names, marketplace classifications, activity types, event identifiers and activity timestamps to your configured ERP, associated with your account. It does not upload full URLs, page titles, page contents, forms or screenshots. ERP tabs are excluded from extension tracking.</p>
  <h2 className="text-lg font-semibold">Storage and purpose</h2>
  <p>Your personal ERP credential, browser name, settings and pending activity records are stored locally in this Chrome profile, outside Chrome sync. The credential is transmitted to your configured ERP to authenticate requests; ERP stores its hash. Credentials expire after 90 days. Activity is used for work time reports, estimates and synchronization. This extension does not sell data or use it for advertising.</p>
  <h2 className="text-lg font-semibold">Retention and control</h2>
  <p>Recent activity waits for an idle safety buffer before upload. Accepted records leave the local pending queue; failed records remain for retry. Records older than seven days require manual review, export or clearing. ERP reports retain uploaded activity under your organization&apos;s record retention practices. Pause tracking in the popup, export or clear pending records in Settings, revoke credentials in ERP, or uninstall the extension. Revocation or uninstalling does not delete activity already uploaded.</p>
  <h2 className="text-lg font-semibold">Access and requests</h2>
  <p>Uploaded records are held by the organization operating your configured ERP. Your personal Work Tracker reports use your authenticated account. Contact your KhyatiGems ERP administrator for access, deletion, retention or privacy requests. Browser names are labels you provide; each Chrome profile connects separately.</p>
 </main>;
}
