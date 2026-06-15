import { InfoPage } from "@/components/auth/info-page";
import { HelpCircle, MessageCircle, Mail, Book, Package, FileText, BarChart3, Printer, Tag, Users, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Help & Support | KhyatiGems ERP",
};

export default function HelpPage() {
  return (
    <InfoPage
      title="Help & Support"
      subtitle="Everything you need to make the most of KhyatiGems ERP"
      lastUpdated={new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            Getting Started
          </h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-medium mb-1">How do I sign in?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Use your registered email and password on the sign-in page. New employees should receive an invite email with a temporary password. If you&apos;ve forgotten your password, click &quot;Forgot password?&quot; on the sign-in page to receive a reset link.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-medium mb-1">What is KhyatiGems ERP?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                KhyatiGems ERP is the central operations platform for our gemstone and jewelry business. It manages the full lifecycle of inventory — from purchase and certification, through pricing and labeling, to listings, sales, and post-sale tracking.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-medium mb-1">Where should I start each day?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Open the <strong>Dashboard</strong>. The <strong>Today&apos;s Work Queue</strong> on the right shows all items needing your attention right now, ranked by severity. <strong>Inventory Health</strong> shows your overall data quality.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Core Modules
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Inventory</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Track every gemstone and jewelry piece with SKU, weight, certification, HSN code, vendor, and media. Use the <strong>Inventory Health</strong> widget to find items missing images, certifications, or HSN codes.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Tag className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Listings</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Publish inventory to marketplaces like eBay, Amazon, Etsy, and your own website. Track listing status, prices, and external IDs from one place.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Quotations & Invoices</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create customer quotations with multi-currency support, convert to invoices, track payment status, and manage follow-ups. Export-ready PDFs for both domestic and export (IEC) sales.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Printer className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Labels & Packaging</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Generate QR-coded labels with checksum pricing for in-store tagging. Bulk-print with custom layouts. Packaging module tracks sealed units via serialized tracking.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Reports</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sales trends, top categories, top gemstones, marketplace sync health, QR scan analytics, and exportable business summaries. Snapshot analytics are computed daily.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Vendors & Customers</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage vendor onboarding, advance payments, customer profiles, follow-ups, credit notes, and sales returns — all linked to your inventory.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Book className="h-5 w-5 text-blue-600" />
            Quick Tips
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>Use the <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono">/</kbd> shortcut on the dashboard to jump to any module</li>
            <li>Your last-uploaded avatar is preserved — switch back any time from the avatar history in your profile menu</li>
            <li>Use the breadcrumb at the top of any page to navigate back quickly</li>
            <li>Data is auto-saved; you don&apos;t need to manually save most forms</li>
            <li>The <strong>Today&apos;s Work Queue</strong> updates every minute — refresh the dashboard to see new tasks</li>
            <li>Click any KPI card on the dashboard to drill into the related inventory filter</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Roles & Permissions
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Access to modules is controlled by your assigned role. The standard roles are:
          </p>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            <div className="p-3 text-sm">
              <strong>Super Admin</strong> — Full access to all modules and settings
            </div>
            <div className="p-3 text-sm">
              <strong>Admin</strong> — Most modules, limited user management
            </div>
            <div className="p-3 text-sm">
              <strong>Sales</strong> — Quotations, invoices, customers, listings
            </div>
            <div className="p-3 text-sm">
              <strong>Accounts</strong> — Payments, expenses, vouchers, reports
            </div>
            <div className="p-3 text-sm">
              <strong>Viewer</strong> — Read-only access to most modules
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Contact Support
          </h2>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-2 text-sm">
            <p><strong>Email:</strong> support@khyatigems.com</p>
            <p><strong>Hours:</strong> Monday – Friday, 10:00 AM – 6:00 PM IST</p>
            <p><strong>Response time:</strong> Within 1 business day</p>
            <p className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-3">
              <strong>For urgent issues</strong> during business hours, message your administrator directly via the in-app notification system.
            </p>
          </div>
        </section>
      </div>
    </InfoPage>
  );
}
