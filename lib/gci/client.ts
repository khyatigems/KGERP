import { httpRequest, HttpError } from "@/lib/marketplace/http";

export interface GciCertificateMetadata {
  certificateNumber: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "NOT_FOUND";
  format: string;
  pdfAvailable: boolean;
}

export interface GciIntegrationConfig {
  baseUrl: string;
  apiKey: string;
}

export function getGciIntegrationConfig(): GciIntegrationConfig | null {
  const baseUrl = (
    process.env.GCI_INTEGRATION_BASE_URL ||
    "https://gemstonecertificationinstitute.com"
  ).replace(/\/+$/, "");
  const apiKey = process.env.GCI_INTEGRATION_API_KEY || process.env.GCI_API_KEY || "";
  if (!apiKey) return null;
  return { baseUrl, apiKey };
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    "X-API-KEY": apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

/**
 * Retrieve certificate availability metadata from GCI's server-to-server
 * integration endpoint (GCI owns generation; ERP owns workflow).
 */
export async function fetchGciCertificateMetadata(
  certificateNumber: string
): Promise<GciCertificateMetadata> {
  const config = getGciIntegrationConfig();
  if (!config) {
    throw new Error("GCI integration is not configured.");
  }
  const url = `${config.baseUrl}/api/integration/certificates/${encodeURIComponent(certificateNumber)}`;
  const response = await httpRequest(url, { headers: authHeaders(config.apiKey) });

  if (response.status === 404) {
    return {
      certificateNumber,
      status: "NOT_FOUND",
      format: "A4",
      pdfAvailable: false,
    };
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("GCI integration authorization failed.");
  }

  if (response.status === 409) {
    return {
      certificateNumber,
      status: "UNAVAILABLE",
      format: "A4",
      pdfAvailable: false,
    };
  }

  if (!response.ok) {
    throw new HttpError(`GCI metadata request failed with HTTP ${response.status}`, response.status);
  }

  const data = (await response.json()) as {
    certificateNumber?: string;
    status?: string;
    format?: string;
    pdfAvailable?: boolean;
  };

  return {
    certificateNumber: data.certificateNumber || certificateNumber,
    status: (data.status === "AVAILABLE" ? "AVAILABLE" : "UNAVAILABLE") as GciCertificateMetadata["status"],
    format: data.format || "A4",
    pdfAvailable: Boolean(data.pdfAvailable),
  };
}

/**
 * Retrieve the A4 certificate PDF bytes from GCI. Returns null when the
 * certificate exists but no A4 PDF is available (HTTP 409).
 */
export async function fetchGciCertificatePdf(
  certificateNumber: string
): Promise<Buffer | null> {
  const config = getGciIntegrationConfig();
  if (!config) {
    throw new Error("GCI integration is not configured.");
  }
  const url = `${config.baseUrl}/api/integration/certificates/${encodeURIComponent(certificateNumber)}/pdf?format=A4`;
  const response = await httpRequest(url, {
    headers: { ...authHeaders(config.apiKey), Accept: "application/pdf" },
  });

  if (response.status === 404) {
    throw new Error(`Certificate ${certificateNumber} not found in GCI.`);
  }
  if (response.status === 409) {
    return null;
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("GCI integration authorization failed.");
  }
  if (!response.ok) {
    throw new HttpError(`GCI PDF request failed with HTTP ${response.status}`, response.status);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
