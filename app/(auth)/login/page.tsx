import { LoginForm } from "@/components/auth/login-form";
import { getLandingPageSettings } from "@/app/(dashboard)/settings/landing-page/actions";
import { Slideshow } from "@/components/auth/slideshow";
import { Check } from "lucide-react";

export default async function LoginPage() {
  const settings = await getLandingPageSettings();
  const activeSlides = settings.slides.filter((s: any) => s.isActive);
  const highlights = settings.highlightsEnabled ? settings.highlights : [];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Login Section */}
      <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-background">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight">{settings.brandTitle}</h1>
            <p className="text-muted-foreground">{settings.subtitle}</p>
          </div>
          
          <LoginForm />
          
          <div className="text-sm text-muted-foreground mt-4 space-y-4">
            <p className="text-center text-xs">{settings.accessNotice}</p>

            {settings.whatsNewEnabled && settings.whatsNewText && (
                <div className="p-3 bg-muted/50 rounded-md border text-left">
                    <span className="block font-semibold mb-1 text-primary text-xs uppercase tracking-wider">What's New</span>
                    <p className="text-sm text-foreground">{settings.whatsNewText}</p>
                </div>
            )}
            
            {highlights.length > 0 && (
                <div className="pt-2 space-y-2">
                    {highlights.map((highlight: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{highlight}</span>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Slideshow Section */}
      <div className="hidden lg:block bg-muted relative">
        {settings.slideshowEnabled && activeSlides.length > 0 ? (
            <Slideshow slides={activeSlides} />
        ) : (
            <div className="flex items-center justify-center h-full bg-slate-900 text-white p-12">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">{settings.subtitle}</h2>
                    <p className="text-slate-400">Secure access for authorized personnel only.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
