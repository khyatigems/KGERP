import {
  getCertificateVerificationUrl,
  resolveInventoryCertificateUrl,
} from "@/lib/certificate-url";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function run() {
  const base = {
    certificateUrl: "https://example.com/cert.pdf",
    certificateNumber: "NOT_USED",
  } as const;
  assert(
    resolveInventoryCertificateUrl(base) === "https://example.com/cert.pdf",
    "Direct certificateUrl should be returned when valid"
  );

  const fromNumber = {
    certificateNumber: "https://cdn.example.com/doc",
  };
  assert(
    resolveInventoryCertificateUrl(fromNumber) === "https://cdn.example.com/doc",
    "certificateNumber should resolve when it is a URL"
  );

  const fromCertificatesArray = {
    certificates: [
      { url: "invalid" },
      { certificateUrl: "https://lab.example.com/item" },
    ],
  };
  assert(
    resolveInventoryCertificateUrl(fromCertificatesArray) === "https://lab.example.com/item",
    "Should return the first valid URL from certificates array"
  );

  const fallbackNull = {
    certificateNumber: "not-a-url",
    certificateNo: "n/a",
    certificateUrl: "",
    certificates: [{ remarks: "not-url" }],
  };
  assert(
    resolveInventoryCertificateUrl(fallbackNull) === null,
    "Should return null when nothing is a valid URL"
  );

  assert(
    getCertificateVerificationUrl(base, "GCI2026ABC123") === "https://example.com/cert.pdf",
    "Certificate email should use the same inventory certificate link as the invoice"
  );
  assert(
    getCertificateVerificationUrl(null, "GCI 2026/ABC") ===
      "https://gemstonecertificationinstitute.com/track-certificate?certificate_number=GCI%202026%2FABC",
    "A GCI verification URL should be generated when the inventory has no saved certificate URL"
  );
  assert(
    getCertificateVerificationUrl(null, null) === null,
    "No verification URL should be generated without a certificate number"
  );
}

run();
console.log("certificate-url.unit.ts passed");
