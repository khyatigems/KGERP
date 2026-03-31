import { normalizeCertificateUrl } from "@/lib/number-formatting";

export type InventoryCertificateSource = {
  certificateUrl?: string | null;
  certification?: string | null;
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
  if (!source) return null;

  const directCandidates = [
    source.certificateUrl,
    source.certification,
    source.certificateNumber,
    source.certificateNo,
    source.certificateComments,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalize(candidate);
    if (normalized) return normalized;
  }

  if (Array.isArray(source.certificates)) {
    for (const certificate of source.certificates) {
      if (!certificate) continue;
      const normalized = normalize(
        certificate.certificateUrl ?? certificate.url ?? certificate.remarks
      );
      if (normalized) return normalized;
    }
  }

  return null;
}
