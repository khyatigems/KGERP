import { InfoPage } from "@/components/auth/info-page";
import { Shield, Database, Lock, Eye, Camera, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy Policy | KhyatiGems ERP",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      subtitle="How KhyatiGems ERP collects, uses, and protects your information"
      lastUpdated={new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Information We Collect
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            KhyatiGems ERP is an internal operations platform used by employees and authorized personnel. We collect only the information necessary to provide our services:
          </p>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-medium text-sm mb-1">Account Information</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your name, email address, role, and profile photo. Profile photos are stored on secured cloud storage (Cloudinary) and may be displayed to other internal users.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-medium text-sm mb-1">Usage Data</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Login timestamps, actions performed (quotations created, inventory edited, labels printed), and last-accessed modules. Used for the &quot;Today&apos;s Work Queue&quot; and audit logging.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-medium text-sm mb-1">Operational Data</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Inventory records, sales, quotations, vendor information, and other business data you enter or that the system generates. This is the core business data the platform is designed to manage.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-medium text-sm mb-1">Device & Connection Data</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                IP address, browser type, and user agent. Used for security audit trails and to detect unusual sign-in patterns.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>To authenticate you and manage your session securely</li>
            <li>To provide access to platform features based on your assigned role</li>
            <li>To log activity for audit, security, and compliance purposes</li>
            <li>To generate the &quot;Today&apos;s Work Queue&quot; and other personalized dashboards</li>
            <li>To improve the platform based on aggregate usage patterns</li>
            <li className="font-medium text-slate-900 dark:text-slate-200">
              We do <strong>not</strong> sell your data to third parties, advertisers, or anyone else
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            Data Security
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Your data is protected with industry-standard security measures:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>Passwords are hashed using bcrypt — they are never stored in plain text</li>
            <li>All connections use HTTPS / TLS encryption in transit</li>
            <li>Database access is restricted to authorized application servers</li>
            <li>Profile photos and label images are stored on secured cloud storage (Cloudinary, with ImageKit as backup)</li>
            <li>Role-based access control limits what each user can see and do</li>
            <li>Session tokens expire after inactivity</li>
            <li>All sensitive actions (login, password reset, role changes) are written to the audit log</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Your Profile Photo
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Profile photos you upload are visible to other internal users of the platform. The platform keeps your last 5 uploaded photos in your avatar history so you can switch back easily. You can remove your photo at any time from the profile menu. Photos are processed for cropping/resizing in your browser before upload — the original full-resolution image is never sent to the server.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Third-Party Services
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            We use the following third-party services to operate the platform:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li><strong>Cloudinary</strong> — for storing profile photos, inventory media, and label images</li>
            <li><strong>ImageKit</strong> — secondary backup storage for images</li>
            <li><strong>Turso (libSQL)</strong> — managed database hosting</li>
            <li><strong>NextAuth.js</strong> — authentication provider</li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
            Each service has its own data handling practices. Only the minimum data required is shared.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li><strong>Update your info:</strong> Edit your name, email, photo, and password at any time</li>
            <li><strong>Export your data:</strong> Request a copy of your account and activity data</li>
            <li><strong>Delete your account:</strong> Contact your administrator to request account deletion</li>
            <li><strong>Operational records</strong> (sales, inventory, quotations) are retained for business continuity, tax, and legal compliance, and are not deleted with your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            For privacy-related questions, contact{" "}
            <a href="mailto:privacy@khyatigems.com" className="text-blue-600 hover:underline">
              privacy@khyatigems.com
            </a>.
          </p>
        </section>
      </div>
    </InfoPage>
  );
}
