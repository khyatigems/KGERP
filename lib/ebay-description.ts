export const DEFAULT_EBAY_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1779786000796-effa1636a7fb?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1779786410107-f1729039bb01?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
];

type EbayDescriptionFields = {
  itemName?: string | null;
  category?: string | null;
  gemType?: string | null;
  color?: string | null;
  shape?: string | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  dimensionsMm?: string | null;
  treatment?: string | null;
  origin?: string | null;
  transparency?: string | null;
  certification?: string | null;
  braceletType?: string | null;
  beadSizeMm?: number | null;
  beadCount?: number | null;
  holeSizeMm?: number | null;
  innerCircumferenceMm?: number | null;
  standardSize?: string | null;
  notes?: string | null;
};

interface BuildEbayDescriptionOptions {
  includeImages?: boolean;
  includeMeasurements?: boolean;
  includeCertificate?: boolean;
  includeOrigin?: boolean;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value?: string | null) {
  if (!value) return "Not specified";
  const trimmed = value.trim();
  return trimmed || "Not specified";
}

function getProductType(category?: string | null, gemType?: string | null) {
  if (category?.toLowerCase().includes("bracelet")) {
    return "Crystal Healing / Gemstone Bracelet";
  }
  if (category?.toLowerCase().includes("bead")) {
    return "Crystal Healing / Gemstone Bead";
  }
  return gemType ? `Natural ${gemType}` : "Natural Gemstone";
}

function getTitle(product: EbayDescriptionFields) {
  const weight = product.weightValue ? `${product.weightValue} ${product.weightUnit || "cts"}` : "";
  return [product.itemName || "Gemstone Product", weight].filter(Boolean).join(" – ");
}

function getProductSummary(product: EbayDescriptionFields) {
  const parts: string[] = [];
  parts.push(`Product Type: ${getProductType(product.category, product.gemType)}`);
  parts.push(`Gemstones: ${normalizeText(product.gemType || product.category)}`);
  if (product.weightValue) {
    parts.push(`Total Weight: ${product.weightValue} ${product.weightUnit || "cts"}`);
  }
  if (product.shape) {
    parts.push(`Bead Shape: ${product.shape}`);
  }
  if (product.color) {
    parts.push(`Color: ${product.color}`);
  }
  if (product.transparency) {
    parts.push(`Transparency: ${product.transparency}`);
  }
  if (product.treatment) {
    parts.push(`Treatment: ${product.treatment}`);
  }
  if (product.certification) {
    parts.push(`Certification: ${product.certification}`);
  }

  return parts.join("\n");
}

function getDetailedDescription(product: EbayDescriptionFields) {
  const name = normalizeText(product.itemName);
  const gemType = normalizeText(product.gemType);
  const weight = product.weightValue ? `${product.weightValue} ${product.weightUnit || "cts"}` : "";
  const shape = normalizeText(product.shape);
  const color = normalizeText(product.color);
  const treatment = normalizeText(product.treatment);
  const origin = normalizeText(product.origin);
  const transparency = normalizeText(product.transparency);

  const summary = [
    `Unlock elegance, authenticity, and value with this stunning ${name.toLowerCase()}.`,
    `Crafted from ${gemType.toLowerCase()}, this item is carefully selected for its premium quality and visual appeal.`,
  ];

  if (weight) {
    summary.push(`It weighs ${weight}, making it a standout piece for collectors and jewelry enthusiasts.`);
  }
  if (color && color !== "Not specified") {
    summary.push(`The color profile is ${color.toLowerCase()}, creating a rich and memorable presence.`);
  }
  if (shape && shape !== "Not specified") {
    summary.push(`Each piece features a ${shape.toLowerCase()} shape with precision and symmetry.`);
  }
  if (treatment && treatment.toLowerCase() !== "none") {
    summary.push(`Treatment: ${treatment}.`);
  }
  if (origin && origin !== "Not specified") {
    summary.push(`Origin: ${origin}.`);
  }
  if (transparency && transparency !== "Not specified") {
    summary.push(`Transparency: ${transparency}.`);
  }

  return summary.join(" ");
}

function getSpecificAttributes(product: EbayDescriptionFields) {
  const rows = [
    ["Product Type", getProductType(product.category, product.gemType)],
    ["Gemstones", normalizeText(product.gemType || product.category)],
    ["Color", normalizeText(product.color)],
    ["Shape", normalizeText(product.shape)],
    ["Weight", product.weightValue ? `${product.weightValue} ${product.weightUnit || "cts"}` : "Not specified"],
    ["Dimensions", normalizeText(product.dimensionsMm)],
    ["Treatment", normalizeText(product.treatment)],
    ["Origin", normalizeText(product.origin)],
    ["Transparency", normalizeText(product.transparency)],
    ["Certification", normalizeText(product.certification)],
  ];

  if (product.braceletType) {
    rows.push(["Bracelet Type", product.braceletType]);
  }
  if (product.beadSizeMm) {
    rows.push(["Bead Size", `${product.beadSizeMm}mm`]);
  }
  if (product.beadCount) {
    rows.push(["Bead Count", String(product.beadCount)]);
  }
  if (product.holeSizeMm) {
    rows.push(["Hole Size", `${product.holeSizeMm}mm`]);
  }
  if (product.innerCircumferenceMm) {
    rows.push(["Inner Circumference", `${product.innerCircumferenceMm}mm`]);
  }
  if (product.standardSize) {
    rows.push(["Standard Size", product.standardSize]);
  }

  return rows;
}


function getBannerBlock(includeImages?: boolean) {
  if (!includeImages) return "";
  return `
    <div style="display:flex;gap:16px;justify-content:center;margin:32px 0 24px 0;">
      ${DEFAULT_EBAY_IMAGE_URLS.map((url, i) => `<img src="${escapeHtml(url)}" alt="KhyatiGems banner ${i+1}" style="max-width:320px;max-height:120px;border-radius:12px;box-shadow:0 2px 12px #181B4E22;object-fit:cover;background:#fff;" />`).join("\n")}
    </div>
  `;
}

export function buildEbayHtmlDescription(product: EbayDescriptionFields, options: BuildEbayDescriptionOptions = {}) {
  const includeImages = options.includeImages ?? true;
  const includeMeasurements = options.includeMeasurements ?? true;
  const includeCertificate = options.includeCertificate ?? true;
  const includeOrigin = options.includeOrigin ?? true;

  const title = getTitle(product);
  const summary = getProductSummary(product);
  const detailedDescription = getDetailedDescription(product);
  const notes = product.notes?.trim();
  const specificAttributes = getSpecificAttributes(product);

  const specsHtml = includeMeasurements
    ? `<table style="width:100%;border-collapse:separate;border-spacing:0 4px;margin:18px 0 0 0;font-size:15px;">
        <tbody>
          ${specificAttributes
            .map(
              ([label, value]) =>
                `<tr>
                  <td style="padding:10px 12px;background:#F8F9FB;color:#181B4E;font-weight:600;border-radius:8px 0 0 8px;border:1px solid #E0E3EA;border-right:none;">${escapeHtml(label)}</td>
                  <td style="padding:10px 12px;background:#fff;color:#181B4E;border-radius:0 8px 8px 0;border:1px solid #E0E3EA;">${escapeHtml(value)}</td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : "";

  const certificateHtml = includeCertificate
    ? `<div style="background:#f0f8ff;padding:18px 20px;margin:24px 0 0 0;border-radius:12px;border-left:5px solid #4a90d9;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="margin-top:0;color:#4a90d9;font-size:18px;font-weight:700;">📜 Certification</h3>
        <p style="margin:0 0 4px 0;"><strong>Certification:</strong> ${escapeHtml(normalizeText(product.certification))}</p>
        <p style="margin:0;">This item is guaranteed to be authentic and carefully curated by KhyatiGems.</p>
      </div>`
    : "";

  const originHtml = includeOrigin
    ? `<div style="background:#fff8f0;padding:18px 20px;margin:24px 0 0 0;border-radius:12px;border-left:5px solid #E94B3C;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="margin-top:0;color:#E94B3C;font-size:18px;font-weight:700;">🌍 Origin & Treatment</h3>
        <p style="margin:0 0 4px 0;"><strong>Origin:</strong> ${escapeHtml(normalizeText(product.origin))}</p>
        <p style="margin:0;"><strong>Treatment:</strong> ${escapeHtml(normalizeText(product.treatment))}</p>
      </div>`
    : "";

  // Brand logo (real image)
  const logoUrl = "https://images.unsplash.com/photo-1779794047454-ad379b48d1ed?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const logoBlock = `
    <div style="text-align:center;margin:0 0 32px 0;">
      <img src="${logoUrl}" alt="KhyatiGems Logo" style="height:72px;max-width:320px;object-fit:contain;border-radius:12px;box-shadow:0 2px 12px #181B4E22;margin-bottom:8px;background:#fff;" />
      <div style="font-size:18px;font-weight:700;color:#181B4E;letter-spacing:1px;">KhyatiGems</div>
      <div style="font-size:13px;color:#E94B3C;font-weight:500;">Precious Gems for your Precious Ones</div>
    </div>
  `;

  // Banner image URLs
  const banner1 = DEFAULT_EBAY_IMAGE_URLS[0];
  const banner2 = DEFAULT_EBAY_IMAGE_URLS[1];

  return `
    <div style="font-family:Inter,Roboto,Arial,sans-serif;max-width:800px;margin:0 auto;background:#fff;border-radius:18px;box-shadow:0 4px 32px #181B4E11;padding:32px 18px 32px 18px;">
      ${logoBlock}
      <h1 style="color:#181B4E;font-size:2rem;font-weight:800;letter-spacing:0.5px;margin:0 0 18px 0;line-height:1.2;">${escapeHtml(title)}</h1>

      <div style="background:#F8F9FB;padding:20px 24px;margin:0 0 28px 0;border-radius:12px;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="margin:0 0 8px 0;color:#E94B3C;font-size:1.1rem;font-weight:700;">🌟 Welcome to KhyatiGems</h3>
        <p style="margin:0;color:#181B4E;font-size:1rem;">At KhyatiGems, a premier brand by Khyati Precious Gems Private Limited, we bring collectors, crystal enthusiasts, and jewelry connoisseurs authentic, premium-quality treasures. Every piece in our collection is carefully curated and accurately described, ensuring complete peace of mind and a luxurious shopping experience.</p>
      </div>

      <div style="margin:32px 0 28px 0;text-align:center;">
        <img src="${banner1}" alt="KhyatiGems banner 1" style="width:100%;max-width:740px;min-width:220px;object-fit:cover;border-radius:14px;box-shadow:0 2px 12px #181B4E22;" />
      </div>

      <div style="background:#fff;padding:20px 24px;margin:0 0 24px 0;border-radius:12px;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="color:#C0A050;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">📋 Product Specifications</h3>
        <p style="white-space: pre-line;color:#181B4E;font-size:1rem;margin:0 0 8px 0;">${escapeHtml(summary)}</p>
      </div>

      <div style="margin:32px 0 28px 0;text-align:center;">
        <img src="${banner2}" alt="KhyatiGems banner 2" style="width:100%;max-width:740px;min-width:220px;object-fit:cover;border-radius:14px;box-shadow:0 2px 12px #181B4E22;" />
      </div>

      <div style="background:#fff;padding:20px 24px;margin:0 0 24px 0;border-radius:12px;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="color:#C0A050;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">🔍 Detailed Description</h3>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 8px 0;">${escapeHtml(detailedDescription)}</p>
        ${notes ? `<p style="color:#181B4E;font-size:1rem;margin:0 0 8px 0;">${escapeHtml(notes)}</p>` : ""}
      </div>

      ${specsHtml}
      ${certificateHtml}
      ${originHtml}

      <div style="background:#F8F9FB;padding:18px 20px;margin:32px 0 0 0;border-radius:12px;text-align:center;box-shadow:0 2px 8px #181B4E11;border-top:3px solid #C0A050;">
        <h3 style="color:#C0A050;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">🛡️ Store Policies & Buying Information</h3>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 4px 0;">Authenticity & Quality Guarantee: We firmly believe our premium products will meet and exceed your expectations. Please allow for slight organic variations in bead patterns and color depth for natural stones.</p>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 4px 0;">Shipping & Handling: Secure packaging, prompt dispatch, and reliable tracking information are provided for each order.</p>
        <p style="color:#181B4E;font-size:1rem;margin:0;">Returns & Customer Satisfaction: If you have any questions before leaving feedback, please contact us through eBay messages.</p>
      </div>

      <div style="background:#fff;padding:18px 20px;margin:32px 0 0 0;border-radius:12px;text-align:center;box-shadow:0 2px 8px #181B4E11;border-top:3px solid #E94B3C;">
        <h3 style="color:#E94B3C;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">🛍️ Closing Note</h3>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 4px 0;">A statement piece with undeniable presence — this item is crafted for those who value authenticity, luxury, and spiritual alignment.</p>
        <p style="color:#181B4E;font-size:1rem;margin:0;">Exclusively offered by Khyati Precious Gems Private Limited. Don’t forget to save khyatigemsofficial to your eBay favorite sellers list for exclusive updates on our latest authentic gemstone arrivals!</p>
      </div>
    </div>
  `;
}
