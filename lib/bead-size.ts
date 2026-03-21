export const normalizeBeadSizeLabel = (input: string) =>
  input
    .normalize("NFKC")
    .trim()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE63\uFF0D]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*\/\s*/g, "/")
    .toUpperCase()
    .replace(/MM/g, "mm");

export const parseBeadSizeMm = (label: string) => {
  const m = label.match(/^(\d+(?:\.\d+)?)mm?$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
};

export const isValidBeadSizeLabel = (label: string) => /^[A-Z0-9.\-\/ ]+$/i.test(label);

