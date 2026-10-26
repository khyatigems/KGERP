import { useId } from "react";
import type { CompanionPreferences } from "@/lib/companion";

export type FacetState = "idle" | "greeting" | "working" | "success" | "notification" | "warning" | "sleeping" | "happy" | "wink" | "resting";
export function Facet({ character, state = "idle" }: { character: CompanionPreferences["character"]; state?: FacetState }) {
  const id = useId();
  const blue = character === "sapphire";
  const resting = state === "sleeping" || state === "resting";
  const happy = state === "happy" || state === "success" || state === "greeting";
  const colors = character === "owl" ? ["#ead9ff", "#9773bf", "#493563"] : character === "fox" ? ["#ffe1a5", "#dc984d", "#914f30"] : character === "sprout" ? ["#fff4cc", "#d9c598", "#9b8b61"] : blue ? ["#b9e6ff", "#3379bf", "#142e65"] : ["#bfffe8", "#249b80", "#123e3a"];
  return <svg viewBox="0 0 100 112" fill="none" aria-hidden="true" className="facet-art" data-character={character} data-state={state}>
    <defs><linearGradient id={id} x1="20" y1="18" x2="85" y2="95" gradientUnits="userSpaceOnUse"><stop stopColor={colors[0]} /><stop offset=".45" stopColor={colors[1]} /><stop offset="1" stopColor={colors[2]} /></linearGradient></defs>
    <ellipse cx="50" cy="103" rx="24" ry="3" fill="currentColor" opacity=".12" />
    <g className="facet-body">
      {(character === "emerald" || character === "sapphire") && <>
        <path d="M21 32 38 12h25l18 20 6 32-37 34L13 64Z" fill={`url(#${id})`} stroke="#d1b477" strokeWidth="1.4" />
        <path d="m38 12-8 28 20-7 13-21M21 32l9 8-17 24 24-3 13 37 14-37 23 3-17-24 11-8M30 40l7 21h27l6-21-20-7-13 28M64 61 50 33" stroke="#e6fff8" strokeOpacity=".35" strokeWidth="1" />
        <path d="m21 32 17-20-8 28Z" fill="white" opacity=".25" /><path d="m64 61 23 3-37 34Z" fill="#081c2a" opacity=".18" />
        <path d="m45 9 5-5 5 5" stroke="#d1b477" strokeWidth="2" strokeLinecap="round" />
      </>}
      {character === "owl" && <>
        <path d="m23 36-2-24 23 14h12l23-14-2 24q12 39-7 56H30Q11 75 23 36Z" fill={`url(#${id})`} stroke="#d1b477" strokeWidth="1.4" />
        <path d="M29 72q21-20 42 0L60 96H40Z" fill="#d9c8e8" opacity=".7" />
        <path d="M24 39q11-14 26 2 15-16 26-2v14Q63 70 50 58 37 70 24 53Z" fill="#f5e9d8" />
        <path className="facet-wing" d="M24 61q-13 7-9 21l17-10" fill="#81609d" stroke="#c3a6d4" strokeWidth="1.5" />
        <path d="m76 61 9 20-17-9M37 99h8m10 0h8" stroke="#c6a76c" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m47 57 3 6 3-6" fill="#c6a76c" /><path d="m45 77 5-5 5 5-5 9Z" fill="#956fb6" stroke="#dcc398" />
      </>}
      {character === "fox" && <>
        <path className="facet-tail" d="M68 77q30-11 20 17-5 10-27 1" fill="#d58a45" stroke="#ddb271" strokeWidth="1.5" /><path d="M88 83q7 19-12 17l-5-8Z" fill="#fff0cf" />
        <path d="m26 44-6-30 23 14h14l23-14-6 30 6 20-18 17 4 16H34l4-16-18-17Z" fill={`url(#${id})`} stroke="#d1b477" strokeWidth="1.4" />
        <path d="m26 23 13 9-11 9Zm48 0-13 9 11 9Z" fill="#874937" /><path d="M23 55q12 1 27 9 15-8 27-9L62 78H38Z" fill="#fff0d2" />
        <path d="m47 61 3 4 3-4Z" fill="#442e31" /><path d="m42 84 8-7 8 7-8 13Z" fill="#f9dd9f" /><path d="M35 99h10m10 0h10" stroke="#8b5637" strokeWidth="3" strokeLinecap="round" />
      </>}
      {character === "sprout" && <>
        <path d="M50 30q-5-11 4-23" stroke="#9c8454" strokeWidth="2.5" /><path className="facet-leaf" d="M52 17Q28 16 30 5q17-2 22 12Zm2-5Q60-2 76 4q-1 13-22 8Z" fill="#9cb977" stroke="#d9ce97" strokeWidth="1.4" />
        <path d="M31 30h38l10 12-3 28-14 11 8 16H30l8-16-14-11-3-28Z" fill={`url(#${id})`} stroke="#ad965f" strokeWidth="1.5" />
        <rect x="27" y="36" width="46" height="29" rx="10" fill="#fff9e1" stroke="#bba977" />
        <path className="facet-wing" d="m32 77-12 9m48-9 12 9" stroke="#b7a572" strokeWidth="5" strokeLinecap="round" />
        <path d="m44 83 6-5 6 5-6 9Z" fill="#749c78" stroke="#f4e7b9" /><path d="M32 99h11m14 0h11" stroke="#9c895c" strokeWidth="3" strokeLinecap="round" />
      </>}
      <g className="facet-eyes" stroke={character === "fox" ? "#442e31" : "#183b3a"} strokeWidth="3.2" strokeLinecap="round">
        {resting ? <path d="M34 51q4 4 8 0m16 0q4 4 8 0" /> : state === "wink" ? <><path d="m34 50 7 3-7 2M62 49v5" /><circle cx="63" cy="49" r=".8" fill="white" stroke="none" /></> : happy ? <path d="m34 53q4-7 8 0m16 0q4-7 8 0" /> : <><path d="M38 49v5m24-5v5" /><circle cx="39" cy="49" r=".8" fill="white" stroke="none" /><circle cx="63" cy="49" r=".8" fill="white" stroke="none" /></>}
      </g>
      {(happy || state === "wink") && <g fill="#ed9e99" opacity=".55"><ellipse cx="30" cy="59" rx="4" ry="2" /><ellipse cx="70" cy="59" rx="4" ry="2" /></g>}
      <path d={resting ? "M47 67h6" : state === "warning" ? "M46 67q4-4 8 0" : happy || state === "wink" ? "M44 64q6 9 12 0" : "M45 64q5 6 10 0"} stroke="#183b3a" strokeWidth="1.8" strokeLinecap="round" />
      <path className="facet-glint" d="M24 25v10m-5-5h10" stroke="#fff6d8" strokeWidth="2" strokeLinecap="round" />
    </g>
    {resting && <g className="facet-sleep" fill="currentColor" opacity=".5" fontFamily="sans-serif" fontSize="10"><text x="78" y="26">z</text><text x="87" y="16" fontSize="7">z</text></g>}
  </svg>;
}
