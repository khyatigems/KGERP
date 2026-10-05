import { httpRequest, HttpError } from "@/lib/marketplace/http";
import puppeteer from "puppeteer";

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

export function isGciIntegrationRouteMissing(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const message = (body as Record<string, unknown>).message;
  return typeof message === "string" &&
    /route .+ could not be found|no route matches/i.test(message);
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
  let response: Response;
  try {
    response = await httpRequest(url, { headers: authHeaders(config.apiKey) });
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    if (error.status === 404 && isGciIntegrationRouteMissing(error.body)) {
      throw new Error(
        "The configured GCI server does not expose the certificate integration API route. Verify GCI_INTEGRATION_BASE_URL and ask GCI to enable /api/integration/certificates/{certificateNumber}."
      );
    }
    if (error.status === 404) {
      return {
        certificateNumber,
        status: "NOT_FOUND",
        format: "A4",
        pdfAvailable: false,
      };
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error("GCI integration authorization failed.");
    }
    if (error.status === 409) {
      return {
        certificateNumber,
        status: "UNAVAILABLE",
        format: "A4",
        pdfAvailable: false,
      };
    }
    throw error;
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
  const url = `${config.baseUrl}/api/integration/certificates/${encodeURIComponent(certificateNumber)}/html`;
  let response: Response;
  try {
    response = await httpRequest(url, {
      headers: { ...authHeaders(config.apiKey), Accept: "text/html" },
    });
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    if (error.status === 404 && isGciIntegrationRouteMissing(error.body)) {
      throw new Error(
        "The configured GCI server does not expose the certificate HTML integration route. Upload the updated GCI integration controller and enable /api/integration/certificates/{certificateNumber}/html."
      );
    }
    if (error.status === 404) {
      throw new Error(`Certificate ${certificateNumber} was not found in GCI.`);
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error("GCI integration authorization failed.");
    }
    if (error.status === 409) return null;
    throw error;
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("GCI integration authorization failed.");
  }
  if (!response.ok) {
    throw new HttpError(`GCI certificate HTML request failed with HTTP ${response.status}`, response.status);
  }

  const html = await response.text();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images, async (image) => {
          if (!image.complete) {
            await new Promise<void>((resolve, reject) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => reject(new Error(`Failed to load certificate image: ${image.src}`)), { once: true });
            });
          }
          if (image.naturalWidth === 0) {
            throw new Error(`Certificate image is unavailable: ${image.src}`);
          }
          await image.decode();
        })
      );
    });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      scale: 1,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
