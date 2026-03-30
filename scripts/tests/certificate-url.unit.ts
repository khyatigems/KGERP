import { resolveInventoryCertificateUrl } from "@/lib/certificate-url";

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
}

run();
console.log("certificate-url.unit.ts passed");
