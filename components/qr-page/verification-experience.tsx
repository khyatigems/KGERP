import { ArrowUpRight, ShieldCheck, Gem, PackageCheck, FileCheck2, Mail, BookOpen, ArrowRight, CircleAlert } from "lucide-react";
import { computeWeightGrams } from "@/lib/utils";
import { formatInrCurrency, normalizeCertificateUrl } from "@/lib/number-formatting";
import Image from "next/image";
import { VerificationPhoto } from "./verification-photo";
import "./verification-experience.css";

export type VerificationItem = {
  serialNumber: string;
  status: "verified" | "preview" | "unmatched";
  packedOn?: string | null;
  inventory?: Record<string, unknown> | null;
};
const WEBSITE = "https://www.khyatigems.com";
const links = { encyclopedia: `${WEBSITE}/gemstones`, story: `${WEBSITE}/about`, care: `${WEBSITE}/gemstone-care` };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
function safeImage(value: unknown) {
  const source = text(value);
  if (source.startsWith("/") && !source.startsWith("//")) return source;
  try { const url = new URL(source); return ["https:", "http:"].includes(url.protocol) ? url.toString() : null; } catch { return null; }
}
function Details({ values }: { values: Array<[string, string]> }) {
  return <dl className="kgv-facts">{values.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
function ProductRecord({ item, eager }: { item: VerificationItem; eager: boolean }) {
  const inv = item.inventory || {};
  const name = text(inv.itemName) || "Your gemstone";
  const sku = text(inv.sku);
  const media = Array.isArray(inv.media) ? inv.media as Array<{ mediaUrl?: string }> : [];
  const image = safeImage(media[0]?.mediaUrl) || safeImage(inv.imageUrl);
  const weight = typeof inv.weightValue === "number" && Number.isFinite(inv.weightValue) ? `${inv.weightValue.toFixed(2)} ct` : "";
  const grams = weight ? computeWeightGrams(inv) : null;
  const lab = text(inv.certificateLab) || text(inv.lab);
  const report = text(inv.certificateNo) || text(inv.certificateNumber);
  const certUrl = normalizeCertificateUrl(inv.certificateComments);
  const price = typeof inv.sellingPrice === "number" && Number.isFinite(inv.sellingPrice) && inv.sellingPrice > 0 ? formatInrCurrency(inv.sellingPrice) : "";
  return <article className="kgv-record" aria-label={`Packaging record for ${name}`}>
    <div className="kgv-status"><span className="kgv-status-icon"><ShieldCheck size={23} aria-hidden="true" /></span><div><strong>Packaging record verified</strong><p>This serial matches a record held by Khyati Gems.</p></div><span className="kgv-status-tag">RECORD MATCHED</span></div>
    <div className="kgv-product-grid">
      <div className="kgv-visual">
        <div className="kgv-image-wrap"><VerificationPhoto source={image} name={name} eager={eager} /></div>
        <div className="kgv-image-caption"><Gem size={15} aria-hidden="true" /><span>{image ? "Product photograph from our records" : "Khyati Gems · Product identity"}</span></div>
        <div className="kgv-trace"><span className="kgv-eyebrow">YOUR PACKAGING REFERENCE</span><strong>{item.serialNumber}</strong><p>Match this reference with the ID on your package.</p></div>
      </div>
      <div className="kgv-product-info">
        <p className="kgv-eyebrow">THE GEMSTONE IN YOUR HANDS</p>
        <h2>{name}</h2>
        {sku && <p className="kgv-sku">SKU <span>{sku}</span></p>}
        <div className="kgv-highlights">{weight && <div><span>Carat weight</span><strong>{weight}</strong>{grams != null && Number.isFinite(grams) && <small>{grams.toFixed(2)} g</small>}</div>}{text(inv.shape) && <div><span>Shape</span><strong>{text(inv.shape)}</strong></div>}{text(inv.color) && <div><span>Colour</span><strong>{text(inv.color)}</strong></div>}</div>
        <section className="kgv-specs"><h3>Know your gemstone</h3><Details values={[["Dimensions", text(inv.dimensionsMm) ? `${text(inv.dimensionsMm)} mm` : ""], ["Cut", text(inv.cutGrade) || text(inv.cut)], ["Transparency", text(inv.transparency)], ["Treatment", text(inv.treatment) || "Not recorded"], ["Gemstone origin", text(inv.originCountry) || text(inv.origin)], ["Clarity", text(inv.clarityGrade) || text(inv.clarity)]]} /></section>
        <section className="kgv-certificate"><div className="kgv-section-heading"><FileCheck2 size={19} aria-hidden="true" /><h3>Laboratory documentation</h3></div>{lab || report || certUrl ? <><Details values={[["Laboratory", lab], ["Report number", report]]} />{certUrl ? <a className="kgv-text-link" href={certUrl} target="_blank" rel="noopener noreferrer">Open laboratory document <ArrowUpRight size={16} aria-hidden="true" /><span className="kgv-sr-only"> (opens in a new tab)</span></a> : <p className="kgv-note">A digital report link is not available. Contact us with your packaging reference if you need a copy.</p>}</> : <p className="kgv-note">No laboratory document is recorded for this item. Our team can help with any questions.</p>}<p className="kgv-disclosure">A matched packaging record confirms the serial in our system. Gemological findings are stated in the laboratory report, where available.</p></section>
        <section className="kgv-package"><div className="kgv-section-heading"><PackageCheck size={19} aria-hidden="true" /><h3>Package details</h3></div><Details values={[["Packed on", item.packedOn || "Not recorded"], ["Recorded retail price", price]]} /><p className="kgv-note">Product details shown are from our current records.</p></section>
      </div>
    </div>
  </article>;
}

export function VerificationExperience({ items, supportEmail }: { items: VerificationItem[]; supportEmail: string }) {
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(supportEmail) ? supportEmail : "support@khyatigems.com";
  const subject = encodeURIComponent(`Packaging enquiry: ${items.map(item => item.serialNumber).join(", ")}`);
  return <div className="kgv-page">
    <a href="#kgv-main" className="kgv-skip">Skip to product verification</a>
    <header className="kgv-header"><a className="kgv-brand" href={WEBSITE} aria-label="Khyati Gems home"><Image src="/brand/khyatigems-logo.png" width={168} height={111} alt="KhyatiGems" className="kgv-brand-logo" loading="eager" /></a><nav aria-label="Brand navigation"><a href={links.story}>Our story</a><a href={links.care}>Gemstone care</a><a className="kgv-website-link" href={WEBSITE}>Visit website <ArrowUpRight size={16} aria-hidden="true" /></a></nav></header>
    <main id="kgv-main" className="kgv-main">
      <div className="kgv-intro"><span className="kgv-eyebrow">KHYATI GEMS / PRODUCT VERIFICATION</span><div><h1>A closer look at<br />your gemstone.</h1><p>Trace your packaging reference.<br className="kgv-desktop-break" /> Discover the details behind your selection.</p></div></div>
      {items.length > 1 && <p className="kgv-count">{items.length} packaging references · {items.filter(item => item.status === "verified").length} matched</p>}
      <div className="kgv-records">{items.map((item, index) => item.status === "verified" ? <ProductRecord key={`${item.serialNumber}-${index}`} item={item} eager={index === items.findIndex(entry => entry.status === "verified")} /> : <section className={`kgv-empty kgv-empty-${item.status}`} key={`${item.serialNumber}-${index}`}><CircleAlert size={30} aria-hidden="true" /><div><span className="kgv-eyebrow">{item.status === "preview" ? "PREVIEW LABEL" : "REFERENCE NOT VERIFIED"}</span><h2>{item.status === "preview" ? "This is a preview, not an issued label." : "We couldn’t verify this packaging reference."}</h2><p>{item.status === "preview" ? "Scan the final issued label to view its product record." : "Check the ID on your package. If it matches the reference below, contact our team so we can help."}</p><code>{item.serialNumber}</code><a href={`mailto:${email}?subject=${subject}`} className="kgv-text-link">Ask our team <ArrowRight size={16} /></a></div></section>)}</div>
      <section className="kgv-support"><div><span className="kgv-eyebrow">HERE FOR YOU, AFTER YOUR PURCHASE</span><h2>A question about your gemstone?</h2><p>Share your packaging reference with our team for help with product details, documentation, or care.</p></div><a className="kgv-button" href={`mailto:${email}?subject=${subject}`}><Mail size={18} aria-hidden="true" /> Contact Khyati Gems <ArrowUpRight size={16} aria-hidden="true" /></a></section>
      <section className="kgv-discover" aria-labelledby="kgv-discover-title"><div className="kgv-discover-heading"><p className="kgv-eyebrow">CONTINUE YOUR JOURNEY</p><h2 id="kgv-discover-title">A little more to discover.</h2></div><div className="kgv-discover-grid"><a href={links.encyclopedia}><Gem size={23} strokeWidth={1.4} aria-hidden="true" /><h3>Understand your gemstone</h3><p>Explore gemstone properties, origins and treatments.</p><span>Explore the encyclopedia <ArrowUpRight size={16} /></span></a><a href={links.care}><BookOpen size={23} strokeWidth={1.4} aria-hidden="true" /><h3>Care for what you treasure</h3><p>Explore our guide to gemstone care.</p><span>Read the care guide <ArrowUpRight size={16} /></span></a><a href={links.story}><ShieldCheck size={23} strokeWidth={1.4} aria-hidden="true" /><h3>Get to know Khyati Gems</h3><p>Our approach to selection and transparency.</p><span>Discover our story <ArrowUpRight size={16} /></span></a></div></section>
    </main>
    <footer className="kgv-footer"><a href={WEBSITE}>KHYATI GEMS <ArrowUpRight size={14} aria-hidden="true" /></a><p>Khyati Precious Gems Private Limited</p><span>Product information. Presented with clarity.</span></footer>
  </div>;
}
