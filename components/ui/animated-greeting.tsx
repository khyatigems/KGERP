"use client";

import { useEffect, useMemo, useState } from "react";

type AnimatedGreetingProps = {
  name?: string | null;
  className?: string;
};

export function AnimatedGreeting({ name, className = "" }: AnimatedGreetingProps) {
  const [firstName, setFirstName] = useState<string | null>(name ?? null);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    // Accept server-provided `name` prop and avoid any client network calls.
    setFirstName(name ?? null);
    const t = setTimeout(() => setPlay(true), 60);
    return () => clearTimeout(t);
  }, [name]);

  const greetingWord = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good Morning";
    if (h >= 12 && h < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // When name is available, render the animated greeting; otherwise show a subtle skeleton
  if (firstName) {
    const label = `${greetingWord}, ${firstName}`;
    const letters = Array.from(label);
    return (
      <div aria-live="polite" className={className}>
        <h1 className={`inline-flex overflow-hidden ${play ? "ag-animate" : ""}`}>
          {letters.map((ch, i) => (
            <span
              key={i}
              className="ag-letter"
              style={{ transitionDelay: `${i * 22}ms` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <style jsx>{`
          .ag-letter {
            display: inline-block;
            opacity: 0;
            transform: translateY(6px);
            will-change: transform, opacity;
          }
          .ag-animate .ag-letter {
            opacity: 1;
            transform: translateY(0);
            transition: transform 260ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease;
          }
        `}</style>
      </div>
    );
  }

  // Skeleton fallback when name is not yet available — branded shimmer
  return (
    <div aria-live="polite" className={className}>
      <div className="ag-shimmer" aria-hidden="true" />
      <span className="sr-only">Loading greeting</span>

      <style jsx>{`
        .ag-shimmer {
          height: 1.5rem; /* 6 */
          width: 10rem; /* ~40 */
          border-radius: 0.375rem;
          /* Use theme tokens for tighter branding */
          background: linear-gradient(90deg, var(--color-muted, #f3f4f6) 0%, var(--color-primary, #3b82f6) 50%, var(--color-muted, #f3f4f6) 100%);
          background-size: 200% 100%;
          animation: ag-shimmer 1.2s linear infinite;
        }
        @keyframes ag-shimmer {
          0% { background-position: -150% 0; }
          100% { background-position: 150% 0; }
        }
      `}</style>
    </div>
  );
}
