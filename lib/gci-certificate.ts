export interface GciCertificateFieldData {
  species?: string | null;
  variety?: string | null;
  color?: string | null;
  weight?: number | string | null;
  shape?: string | null;
  measurements?: string | null;
  origin?: string | null;
  treatment?: string | null;
  fluorescence?: string | null;
  hasImages?: boolean;
}

export function getMissingGciFields(data: GciCertificateFieldData): string[] {
  const missing: string[] = [];

  if (!data.species) missing.push("Species");
  if (!data.variety) missing.push("Variety");
  if (!data.color) missing.push("Color");
  if (!data.weight || Number(data.weight) <= 0) missing.push("Weight");
  if (!data.shape) missing.push("Shape");
  if (!data.origin) missing.push("Origin");
  if (!data.treatment) missing.push("Treatments");
  if (!data.fluorescence) missing.push("Fluorescence");
  if (!data.hasImages) missing.push("Images");

  return missing;
}
