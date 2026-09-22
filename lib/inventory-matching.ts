export interface MatchConfig {
  caratTolerance: number;
  caratTolerancePercent: number;
  clarityToleranceGrades: number;
  cutToleranceGrades: number;
  dimensionToleranceMm: number;
  minScore: number;
  excellentThreshold: number;
  goodThreshold: number;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  caratTolerance: 0.05,
  caratTolerancePercent: 2,
  clarityToleranceGrades: 1,
  cutToleranceGrades: 1,
  dimensionToleranceMm: 0.2,
  minScore: 90,
  excellentThreshold: 130,
  goodThreshold: 110,
};

export interface InventoryItem {
  id: string;
  sku: string;
  itemName: string;
  gemType: string | null;
  color: string | null;
  shape: string | null;
  carats: number;
  clarity: string | null;
  clarityGrade: string | null;
  cut: string | null;
  cutGrade: string | null;
  dimensionsMm: string | null;
  measurements: string | null;
  origin: string | null;
  treatment: string | null;
  certification: string | null;
  lab: string | null;
  sellingPrice: number;
  imageUrl: string | null;
  status: string;
}

export type MatchType = 'PAIR' | 'SET_3' | 'SET_4';

export interface MatchDetails {
  gemType: boolean;
  color: boolean;
  shape: boolean;
  carats: { diff: number; withinTolerance: boolean };
  clarity: 'exact' | 'adjacent' | 'mismatch';
  cut: 'exact' | 'adjacent' | 'mismatch';
  origin: boolean;
  treatment: boolean;
  certification: boolean;
  dimensions?: { withinTolerance: boolean; diffs: number[] };
}

export interface MatchResult {
  id: string;
  matchType: MatchType;
  score: number;
  items: InventoryItem[];
  matchDetails: MatchDetails;
  totalValue: number;
  suggestedPrice: number;
}

export interface MatchSummary {
  excellentCount: number;
  goodCount: number;
  possibleCount: number;
}

function normalizeString(val: string | null | undefined): string {
  return (val || '').trim().toLowerCase();
}

function parseDimensions(dimStr: string | null): number[] | null {
  if (!dimStr) return null;
  const parts = dimStr.split(/[xX×]/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  return parts.length > 0 ? parts : null;
}

function compareDimensions(a: string | null, b: string | null, tolerance: number): { withinTolerance: boolean; diffs: number[] } {
  const dimsA = parseDimensions(a);
  const dimsB = parseDimensions(b);
  if (!dimsA || !dimsB || dimsA.length !== dimsB.length) {
    return { withinTolerance: false, diffs: [] };
  }
  const diffs = dimsA.map((v, i) => Math.abs(v - dimsB[i]));
  const withinTolerance = diffs.every(d => d <= tolerance);
  return { withinTolerance, diffs };
}

const CLARITY_GRADES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];

function clarityGradeIndex(clarity: string | null): number {
  if (!clarity) return -1;
  const normalized = clarity.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const idx = CLARITY_GRADES.indexOf(normalized);
  return idx >= 0 ? idx : -1;
}

function areClarityAdjacent(a: string | null, b: string | null, tolerance: number): boolean {
  const idxA = clarityGradeIndex(a);
  const idxB = clarityGradeIndex(b);
  if (idxA === -1 || idxB === -1) return false;
  return Math.abs(idxA - idxB) <= tolerance;
}

const CUT_GRADES = ['EX', 'VG', 'G', 'F', 'P'];

function cutGradeIndex(cut: string | null): number {
  if (!cut) return -1;
  const normalized = cut.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const idx = CUT_GRADES.indexOf(normalized);
  return idx >= 0 ? idx : -1;
}

function areCutAdjacent(a: string | null, b: string | null, tolerance: number): boolean {
  const idxA = cutGradeIndex(a);
  const idxB = cutGradeIndex(b);
  if (idxA === -1 || idxB === -1) return false;
  return Math.abs(idxA - idxB) <= tolerance;
}

function mergeMatchDetails(details: MatchDetails[]): MatchDetails {
  if (details.length === 0) {
    return {
      gemType: false, color: false, shape: false,
      carats: { diff: 0, withinTolerance: false },
      clarity: 'mismatch', cut: 'mismatch',
      origin: false, treatment: false, certification: false
    };
  }
  const merged: MatchDetails = { ...details[0] };
  for (let i = 1; i < details.length; i++) {
    const d = details[i];
    merged.gemType = merged.gemType && d.gemType;
    merged.color = merged.color && d.color;
    merged.shape = merged.shape && d.shape;
    merged.carats = {
      diff: merged.carats.diff + d.carats.diff,
      withinTolerance: merged.carats.withinTolerance && d.carats.withinTolerance,
    };
    if (d.clarity === 'exact') merged.clarity = 'exact';
    else if (d.clarity === 'adjacent' && merged.clarity !== 'exact') merged.clarity = 'adjacent';
    if (d.cut === 'exact') merged.cut = 'exact';
    else if (d.cut === 'adjacent' && merged.cut !== 'exact') merged.cut = 'adjacent';
    merged.origin = merged.origin && d.origin;
    merged.treatment = merged.treatment && d.treatment;
    merged.certification = merged.certification && d.certification;
  }
  return merged;
}

function scorePair(
  a: InventoryItem,
  b: InventoryItem,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): MatchResult | null {
  if (!a.gemType || !b.gemType || normalizeString(a.gemType) !== normalizeString(b.gemType)) return null;
  if (!a.color || !b.color || normalizeString(a.color) !== normalizeString(b.color)) return null;
  if (!a.shape || !b.shape || normalizeString(a.shape) !== normalizeString(b.shape)) return null;

  const caratDiff = Math.abs(a.carats - b.carats);
  const caratTolerance = Math.max(config.caratTolerance, Math.max(a.carats, b.carats) * config.caratTolerancePercent / 100);
  if (caratDiff > caratTolerance) return null;

  let score = 100;
  const details: MatchDetails = {
    gemType: true,
    color: true,
    shape: true,
    carats: { diff: caratDiff, withinTolerance: true },
    clarity: 'mismatch',
    cut: 'mismatch',
    origin: false,
    treatment: false,
    certification: false,
  };

  if (a.clarity && a.clarity === b.clarity) { score += 20; details.clarity = 'exact'; }
  else if (areClarityAdjacent(a.clarity, b.clarity, config.clarityToleranceGrades)) { score += 10; details.clarity = 'adjacent'; }

  if (a.cut && a.cut === b.cut) { score += 15; details.cut = 'exact'; }
  else if (areCutAdjacent(a.cut, b.cut, config.cutToleranceGrades)) { score += 8; details.cut = 'adjacent'; }

  if (a.origin && a.origin === b.origin) { score += 10; details.origin = true; }
  if (a.treatment && a.treatment === b.treatment) { score += 10; details.treatment = true; }
  if (a.certification && a.certification === b.certification) { score += 10; details.certification = true; }
  if (a.lab && a.lab === b.lab) { score += 5; }

  const dimResult = compareDimensions(a.dimensionsMm, b.dimensionsMm, config.dimensionToleranceMm);
  if (dimResult.withinTolerance) { score += 5; details.dimensions = dimResult; }

  if (score < config.minScore) return null;

  return {
    id: `${a.id}-${b.id}`,
    matchType: 'PAIR',
    score,
    items: [a, b],
    matchDetails: details,
    totalValue: a.sellingPrice + b.sellingPrice,
    suggestedPrice: Math.round((a.sellingPrice + b.sellingPrice) * 1.08),
  };
}

export function findPairs(
  items: InventoryItem[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): MatchResult[] {
  const pairs: MatchResult[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const match = scorePair(items[i], items[j], config);
      if (match) pairs.push(match);
    }
  }
  return pairs.sort((a, b) => b.score - a.score);
}

export function findSets(
  items: InventoryItem[],
  setSize: 3 | 4,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): MatchResult[] {
  const pairs = findPairs(items, config);
  const sets: MatchResult[] = [];
  const used = new Set<string>();

  if (setSize === 3) {
    for (const pair of pairs) {
      for (const item of items) {
        if (pair.items.some(p => p.id === item.id)) continue;
        const m1 = scorePair(pair.items[0], item, config);
        const m2 = scorePair(pair.items[1], item, config);
        if (m1 && m2 && m1.score >= config.minScore && m2.score >= config.minScore) {
          const avgScore = Math.round((pair.score + m1.score + m2.score) / 3);
          if (avgScore >= config.minScore) {
            const key = [pair.items[0].id, pair.items[1].id, item.id].sort().join('-');
            if (used.has(key)) continue;
            used.add(key);
            sets.push({
              id: key,
              matchType: 'SET_3',
              score: avgScore,
              items: [pair.items[0], pair.items[1], item],
              matchDetails: mergeMatchDetails([pair.matchDetails, m1.matchDetails, m2.matchDetails]),
              totalValue: pair.totalValue + item.sellingPrice,
              suggestedPrice: Math.round((pair.totalValue + item.sellingPrice) * 1.12),
            });
          }
        }
      }
    }
  } else if (setSize === 4) {
    for (const pair of pairs) {
      for (const item of items) {
        if (pair.items.some(p => p.id === item.id)) continue;
        const m1 = scorePair(pair.items[0], item, config);
        if (!m1 || m1.score < config.minScore) continue;
        for (const item2 of items) {
          if (pair.items.some(p => p.id === item2.id) || item.id === item2.id) continue;
          const m2 = scorePair(pair.items[1], item2, config);
          const m3 = scorePair(item, item2, config);
          if (m2 && m3 && m2.score >= config.minScore && m3.score >= config.minScore) {
            const avgScore = Math.round((pair.score + m1.score + m2.score + m3.score) / 4);
            if (avgScore >= config.minScore) {
              const key = [pair.items[0].id, pair.items[1].id, item.id, item2.id].sort().join('-');
              if (used.has(key)) continue;
              used.add(key);
              sets.push({
                id: key,
                matchType: 'SET_4',
                score: avgScore,
                items: [pair.items[0], pair.items[1], item, item2],
                matchDetails: mergeMatchDetails([pair.matchDetails, m1.matchDetails, m2.matchDetails, m3.matchDetails]),
                totalValue: pair.totalValue + item.sellingPrice + item2.sellingPrice,
                suggestedPrice: Math.round((pair.totalValue + item.sellingPrice + item2.sellingPrice) * 1.15),
              });
            }
          }
        }
      }
    }
  }

  return sets.sort((a, b) => b.score - a.score);
}

export function findAllMatches(
  items: InventoryItem[],
  includeSets = true,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): { pairs: MatchResult[]; sets: MatchResult[]; summary: MatchSummary } {
  const pairs = findPairs(items, config);
  const sets3 = includeSets ? findSets(items, 3, config) : [];
  const sets4 = includeSets ? findSets(items, 4, config) : [];
  const allSets = [...sets3, ...sets4];

  const summary: MatchSummary = {
    excellentCount: 0,
    goodCount: 0,
    possibleCount: 0,
  };

  const categorize = (score: number) => {
    if (score >= config.excellentThreshold) summary.excellentCount++;
    else if (score >= config.goodThreshold) summary.goodCount++;
    else summary.possibleCount++;
  };

  pairs.forEach(p => categorize(p.score));
  allSets.forEach(s => categorize(s.score));

  return { pairs, sets: allSets, summary };
}

export function getMatchQuality(score: number, config: MatchConfig = DEFAULT_MATCH_CONFIG): 'excellent' | 'good' | 'possible' {
  if (score >= config.excellentThreshold) return 'excellent';
  if (score >= config.goodThreshold) return 'good';
  return 'possible';
}

export function getMatchQualityLabel(quality: 'excellent' | 'good' | 'possible'): string {
  switch (quality) {
    case 'excellent': return 'Excellent Match';
    case 'good': return 'Good Match';
    case 'possible': return 'Possible Match';
  }
}

export function getMatchQualityColor(quality: 'excellent' | 'good' | 'possible'): string {
  switch (quality) {
    case 'excellent': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'good': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    case 'possible': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
  }
}