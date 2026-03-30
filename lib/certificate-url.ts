import { normalizeCertificateUrl } from "@/lib/number-formatting";

export type InventoryCertificateSource = {
  certificateUrl?: string | null;
  certificateNumber?: string | null;
  certificateNo?: string | null;
  certificateComments?: string | null;
  certificates?: Array<{
    url?: string | null;
    certificateUrl?: string | null;
    remarks?: string | null;
  } | null> | null;
};

function normalize(candidate: unknown): string | null {
  if (candidate == null) return null;
  return normalizeCertificateUrl(typeof candidate === "string" ? candidate : String(candidate));
}

export function resolveInventoryCertificateUrl(source: InventoryCertificateSource | null | undefined): string | null {
  if (!source) {
    console.log('[Certificate Debug] No source provided');
    return null;
  }

  const directCandidates = [
    source.certificateUrl,
    source.certificateNumber,
    source.certificateNo,
    source.certificateComments,
  ];

  console.log('[Certificate Debug] Source:', source);
  console.log('[Certificate Debug] Direct candidates:', directCandidates);

  for (const candidate of directCandidates) {
    const normalized = normalize(candidate);
    console.log('[Certificate Debug] Candidate:', candidate, '-> Normalized:', normalized);
    if (normalized) return normalized;
  }

  if (Array.isArray(source.certificates)) {
    console.log('[Certificate Debug] Checking certificates array:', source.certificates);
    for (const certificate of source.certificates) {
      if (!certificate) continue;
      const normalized = normalize(
        certificate.certificateUrl ?? certificate.url ?? certificate.remarks
      );
      console.log('[Certificate Debug] Certificate:', certificate, '-> Normalized:', normalized);
      if (normalized) return normalized;
    }
  }

  console.log('[Certificate Debug] No certificate URL found');
  return null;
}
