export interface MatchedPairItem {
  id: string;
  matchType: "PAIR" | "SET_3" | "SET_4";
  score: number;
  items: Array<{
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
  }>;
  matchDetails: {
    gemType: boolean;
    color: boolean;
    shape: boolean;
    carats: { diff: number; withinTolerance: boolean };
    clarity: "exact" | "adjacent" | "mismatch";
    cut: "exact" | "adjacent" | "mismatch";
    origin: boolean;
    treatment: boolean;
    certification: boolean;
  };
  totalValue: number;
  suggestedPrice: number;
}

export interface MatchedPairsResponse {
  pairs: MatchedPairItem[];
  sets: MatchedPairItem[];
  results: MatchedPairItem[];
  total: number;
  totalValue: number;
  summary: {
    excellentPairs: number;
    goodPairs: number;
    possibleMatches: number;
    totalPairs: number;
    totalSets: number;
  };
}

export type MatchedPairTab = "ALL" | "PAIR" | "SET_3" | "SET_4";