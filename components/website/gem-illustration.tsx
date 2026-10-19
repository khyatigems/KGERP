export const gemColours: Record<string, string> = {
  garnet: "#92294b",
  amethyst: "#8855b1",
  aquamarine: "#6abacb",
  diamond: "#a8c8d3",
  emerald: "#258967",
  pearl: "#c6bbb3",
  moonstone: "#a4b8d9",
  alexandrite: "#7474a3",
  ruby: "#b52d4b",
  peridot: "#83a541",
  spinel: "#bc6485",
  "blue-sapphire": "#486ca9",
  opal: "#9ac6c2",
  tourmaline: "#b2658c",
  topaz: "#66a5c8",
  citrine: "#d5a338",
  turquoise: "#46a8ae",
  tanzanite: "#7272b9",
  zircon: "#6099b5",
};
/** Original decorative navigation artwork, never specimen identification evidence. */
export function GemIllustration({
  colour = "#476eaa",
  rounded = false,
}: {
  colour?: string;
  rounded?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 160 132"
      className="gem-illustration"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        cx="80"
        cy="121"
        rx="44"
        ry="5"
        fill="currentColor"
        opacity=".08"
      />
      {rounded ? (
        <g>
          <ellipse
            cx="80"
            cy="62"
            rx="45"
            ry="48"
            fill={colour}
            stroke="currentColor"
            strokeOpacity=".2"
          />
          <ellipse cx="68" cy="45" rx="22" ry="20" fill="white" opacity=".4" />
          <path
            d="M105 34c22 37 8 57-20 66"
            fill="none"
            stroke="black"
            strokeWidth="9"
            opacity=".08"
          />
        </g>
      ) : (
        <g
          fill={colour}
          stroke="currentColor"
          strokeOpacity=".2"
          strokeWidth="1"
        >
          <path d="M39 17h82l25 37-66 61L14 54Z" />
          <path d="m39 17 18 37h46l18-37Z" fill="white" fillOpacity=".24" />
          <path d="m14 54 43 0 23 61Z" fill="black" fillOpacity=".2" />
          <path d="m103 54 43 0-66 61Z" fill="black" fillOpacity=".32" />
          <path d="M57 54h46l-23 61Z" fill="white" fillOpacity=".12" />
          <path
            d="m39 17 18 37 23-37 23 37 18-37M14 54h132"
            fill="none"
            stroke="white"
            strokeOpacity=".55"
          />
        </g>
      )}
      <path d="M128 6v14m-7-7h14" stroke="currentColor" opacity=".4" />
    </svg>
  );
}
