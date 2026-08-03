import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="sass-enter">{children}</div>;
}
