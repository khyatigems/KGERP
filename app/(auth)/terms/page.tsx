import { InfoPage } from "@/components/auth/info-page";
import { FileText, UserCheck, AlertTriangle, Scale, Gem } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Terms of Service | KhyatiGems ERP",
};

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of Service"
      subtitle="The rules and guidelines for using KhyatiGems ERP"
      lastUpdated={new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            1. Acceptance of Terms
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            By accessing and using KhyatiGems ERP, you agree to be bound by these Terms of Service. This platform is intended for <strong>authorized internal use only</strong> by employees, contractors, and authorized personnel of Khyati Gems. If you do not agree, you must not access or use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Gem className="h-5 w-5 text-blue-600" />
            2. Purpose of the Platform
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            KhyatiGems ERP is designed to support the operations of a gemstone and jewelry business, including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>Inventory management of gemstones, jewelry pieces, and accessories</li>
            <li>Vendor onboarding, purchase tracking, and payment management</li>
            <li>Customer quotation, invoicing, and follow-up workflows</li>
            <li>Marketplace listing management (eBay, Amazon, Etsy, website, etc.)</li>
            <li>Label printing and serialized unit tracking</li>
            <li>Sales analytics, reporting, and QR-scan analytics</li>
            <li>Internal user and role management</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            3. Acceptable Use
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">You agree to:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>Use the platform only for legitimate business operations of Khyati Gems</li>
            <li>Keep your login credentials secure and confidential — do not share your password</li>
            <li>Log out when leaving your workstation unattended</li>
            <li>Report any suspected security incident or unauthorized access immediately</li>
            <li>Enter accurate and truthful business data</li>
            <li>Comply with all applicable Indian and international laws (including GST, customs, and export regulations for international sales)</li>
            <li>Treat all customer, vendor, and pricing information as confidential</li>
            <li>Use the audit and reporting features honestly — do not manipulate metrics or falsify records</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            4. Prohibited Activities
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">You must <strong>not</strong>:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>Share your account credentials with anyone — your account is for your use only</li>
            <li>Attempt to access data, modules, or records outside your authorized role</li>
            <li>Upload malicious files, scripts, or content intended to compromise the platform</li>
            <li>Reverse-engineer, decompile, or attempt to extract source code</li>
            <li>Use the platform for personal commercial activity, side businesses, or unauthorized purposes</li>
            <li>Bypass access controls, rate limits, or any technical restrictions</li>
            <li>Share confidential business data (customer info, pricing, vendor details) with external parties without authorization</li>
            <li>Use the platform to misrepresent gemstones, treatments, or origins on customer-facing materials</li>
            <li>Disable or circumvent the activity audit logging</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Account Suspension</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your administrator may suspend or terminate your access if:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400 mt-2">
            <li>You violate these terms</li>
            <li>Your employment or engagement with Khyati Gems ends</li>
            <li>Security requires immediate action (e.g., suspected compromised credentials)</li>
            <li>Extended inactivity (your administrator may auto-disable stale accounts)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Data Accuracy</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The platform is a tool — business decisions (pricing, customer commitments, regulatory filings) remain your responsibility. Always verify critical data before acting on it. While the platform includes validation and audit features, accuracy depends on the data entered.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Service Availability</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We aim for high availability but the platform may undergo scheduled maintenance, updates, or experience unplanned downtime. Status updates are posted in the in-app &quot;What&apos;s New&quot; section. For critical operations, maintain offline records of recent transactions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            8. Limitation of Liability
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            KhyatiGems ERP is provided &quot;as is&quot; without warranties of any kind. Khyati Gems shall not be liable for any indirect, incidental, special, or consequential damages arising from use of the platform, including but not limited to loss of profits, data, or business opportunity. Total liability shall not exceed the fees paid for the platform in the prior 12 months.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We may update these terms periodically. Material changes will be communicated through the in-app &quot;What&apos;s New&quot; section and via email. Continued use of the platform after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Governing Law & Jurisdiction</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in the city where Khyati Gems is registered.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            For questions about these terms, contact{" "}
            <a href="mailto:legal@khyatigems.com" className="text-blue-600 hover:underline">
              legal@khyatigems.com
            </a>.
          </p>
        </section>
      </div>
    </InfoPage>
  );
}
