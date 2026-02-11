import { LoginForm } from "@/components/auth/login-form";
import { getLandingPageSettings } from "@/app/(dashboard)/settings/landing-page/actions";
import { Check } from "lucide-react";
import Image from "next/image";

export default async function LoginPage() {
  const settings = await getLandingPageSettings();
  const highlights = settings.highlightsEnabled ? settings.highlights : [];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login-bg.png"
          alt="Background"
          fill
          className="object-cover"
          quality={100}
          priority
        />
        {/* Overlay for better text contrast/glass effect base */}
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
      </div>

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-md bg-white/30 border border-white/40 shadow-2xl rounded-2xl p-8 md:p-10 overflow-hidden">
            {/* Decorative subtle gradients for glass depth */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-white/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 drop-shadow-sm">{settings.brandTitle}</h1>
                    <p className="text-slate-800 font-medium drop-shadow-sm">{settings.subtitle}</p>
                </div>

                <LoginForm />

                <div className="space-y-4 pt-2">
                    <p className="text-center text-xs text-slate-700 font-medium">{settings.accessNotice}</p>

                    {settings.whatsNewEnabled && settings.whatsNewText && (
                        <div className="p-4 bg-white/40 rounded-lg border border-white/30 backdrop-blur-sm shadow-sm">
                            <span className="block font-semibold mb-1 text-slate-900 text-xs uppercase tracking-wider">What&apos;s New</span>
                            <p className="text-sm text-slate-800">{settings.whatsNewText}</p>
                        </div>
                    )}

                    {highlights.length > 0 && (
                        <div className="pt-2 space-y-2">
                            {highlights.map((highlight: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-800 font-medium">
                                    <Check className="h-4 w-4 text-slate-900 mt-0.5 shrink-0" />
                                    <span>{highlight}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Footer Credit/Copyright if needed, outside the card */}
        <div className="mt-8 text-center text-white/80 text-xs drop-shadow-md">
            &copy; {new Date().getFullYear()} Khyati Gems. All rights reserved.
        </div>
      </div>
    </div>
  );
}
