"use client";

import { useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { MediaGallery } from "@/components/preview/media-gallery";
import { StatusBadge } from "@/components/preview/status-badge";
import type { Inventory } from "@prisma/client";
import { ArrowUpRight, BadgeCheck, MessageCircle } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryQrPayButton } from "@/components/preview/inventory-qr-pay-button";

type InventoryCertificate = { id: string; name: string; remarks?: string | null; [key: string]: unknown };
type CompanySettings = { phone?: string | null; email?: string | null; [key: string]: unknown };
type GalleryMedia = { id: string; mediaType: string; mediaUrl: string; isPrimary: boolean; alt?: string };
type PublicInventory = Pick<Inventory,
  | "sku" | "itemName" | "status" | "gemType" | "stoneType"
  | "weightValue" | "weightUnit" | "carats" | "weightRatti" | "certificateNo" | "certificateNumber"
  | "certification" | "lab" | "certificateLab" | "shape" | "color" | "clarity" | "clarityGrade"
  | "cut" | "cutGrade" | "polish" | "symmetry" | "fluorescence" | "measurements" | "dimensionsMm"
  | "origin" | "originCountry" | "treatment" | "transparency" | "pricingMode" | "sellingRatePerCarat"
  | "flatSellingPrice" | "imageUrl" | "videoUrl"
>;

interface Props {
  item: PublicInventory & { colorCode?: { name: string } | null; gemstoneCode?: { name: string } | null; cutCode?: { name: string } | null; media: { id: string; type: string; mediaUrl: string; isPrimary: boolean }[]; certificates: InventoryCertificate[] };
  companySettings: CompanySettings | null;
  rate: number;
  totalAmount: number;
  isPerCarat: boolean;
  descriptionHtml: string;
  qrPaymentAmount: number | null;
  qrPaymentDue: number;
  qrAllowPartial: boolean;
  certificateUrl: string | null;
}

const SITE = "https://www.khyatigems.com";
const whatsappEnquiry = "https://wa.me/919915270295?text=Hello%20KhyatiGems%2C%20I%20would%20like%20to%20make%20an%20enquiry.";

const brandSlides = [
  { id: "brand-meet", title: "Meet Khyati Gems", mediaUrl: "https://res.cloudinary.com/dxu1jawbs/image/upload/v1792921775/Khyati_Gems__Chosen_with_Care_ysz9iv.png" },
  { id: "brand-quality", title: "Quality, Inspection & GCI Certification", mediaUrl: "https://res.cloudinary.com/dxu1jawbs/image/upload/v1792921781/Gemstone_Quality_and_Certification_vydwl1.png" },
  { id: "brand-expertise", title: "Our Gemstone Expertise", mediaUrl: "https://res.cloudinary.com/dxu1jawbs/image/upload/v1792921777/Gemstone_Expertise_in_Action_ydtmsw.png" },
  { id: "brand-delivery", title: "Secure Packaging & Delivery", mediaUrl: "https://res.cloudinary.com/dxu1jawbs/image/upload/v1792921775/Carefully_Packed_Gemstone_Journey_rwlhta.png" },
  { id: "brand-support", title: "Customer Support & After-Sales Service", mediaUrl: "https://res.cloudinary.com/dxu1jawbs/image/upload/v1792921784/Khyati_Gems_Customer_Support_Showcase_dzmu0x.png" },
];

const productPlaceholder: GalleryMedia = {
  id: "product-image-unavailable",
  mediaType: "IMAGE",
  mediaUrl: "https://res.cloudinary.com/dxu1jawbs/image/upload/v1792924259/Elegant_Gemstone_Photo_Unavailable_Placeholder_rux3g5.png",
  isPrimary: true,
  alt: "Product image currently unavailable",
};

const navigation = [
  ["Home", "/"],
  ["Gemstone Encyclopedia", "/gemstones"],
  ["Gemstone Guides", "/learn"],
  ["Certification", "/certification"],
  ["Our Story", "/about"],
  ["Where to Buy", "/where-to-buy"],
  ["Contact", "/contact"],
  ["Ask KhyatiGems", "/ask"],
] as const;

const footerGroups = [
  { title: "Explore", links: [["Gemstone library", "/gemstones"], ["A–Z index", "/gemstones/a-z"], ["Gemstone families", "/gemstone-families"], ["Birthstones", "/birthstones"], ["Compare gemstones", "/compare"]] },
  { title: "Learn", links: [["Knowledge centre", "/learn"], ["Laboratory reports", "/certification"], ["Ask KhyatiGems", "/ask"]] },
  { title: "KhyatiGems", links: [["Our story", "/about"], ["Brand film", "/brand-film"], ["Brand lookbook", "/lookbook"], ["Guidance & services", "/services"], ["Frequently asked questions", "/faq"], ["Where to buy", "/where-to-buy"], ["Contact & corrections", "/contact"]] },
];

const socialLinks = [
  { label: "Instagram", path: "instagram", href: "https://www.instagram.com/khyati.gems/?hl=en" },
  { label: "Facebook", path: "facebook", href: "https://www.facebook.com/khyatipreciousgems/" },
  { label: "LinkedIn", path: "linkedin", href: "https://www.linkedin.com/company/khyatigems/" },
  { label: "X", path: "x", href: "https://x.com/Khyati_Gems" },
  { label: "Pinterest", path: "pinterest", href: "https://in.pinterest.com/khyatipreciousgems/" },
  { label: "Google reviews", path: "google", href: "https://g.page/r/CVUsCriEo6hkEBM/review" },
];

function SiteHeader() {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <>
      <a className="kg-skip-link" href="#kg-main">Skip to content</a>
      <header className="kg-site-header">
        <a href={`${SITE}/`} className="kg-brand" aria-label="KhyatiGems home">
          <Image src="/brand/khyatigems-logo.png" alt="KhyatiGems" width={168} height={80} priority />
        </a>
        <nav aria-label="Primary navigation" className="kg-desktop-navigation">
          {navigation.map(([label, href]) => <a key={href} href={`${SITE}${href}`}>{label}</a>)}
        </nav>
        <details
          ref={menu}
          className="kg-mobile-navigation"
          onClick={(event) => { if ((event.target as HTMLElement).closest("a") && menu.current) menu.current.open = false; }}
          onKeyDown={(event) => { if (event.key === "Escape" && menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}
        >
          <summary aria-label="Toggle site navigation"><span>Menu</span><span className="kg-menu-icon" aria-hidden="true"><i /><i /><i /></span></summary>
          <div className="kg-mobile-navigation-panel">
            <div className="kg-mobile-navigation-heading"><span>KhyatiGems</span><p>Explore gemstones and find trusted guidance.</p></div>
            <nav aria-label="Mobile navigation">
              <section><h2>Explore</h2>{navigation.slice(1, 4).map(([label, href]) => <a key={href} href={`${SITE}${href}`}>{label}</a>)}</section>
              <section><h2>KhyatiGems</h2>{navigation.slice(4, 8).map(([label, href]) => <a key={href} href={`${SITE}${href}`}>{label}</a>)}<a href={`${SITE}/services`}>Guidance &amp; services</a><a href={`${SITE}/lookbook`}>Brand lookbook</a></section>
            </nav>
            <a className="kg-mobile-navigation-ask" href={`${SITE}/ask`}><span>Have a gemstone question?</span><strong>Ask KhyatiGems <span aria-hidden="true">→</span></strong></a>
          </div>
        </details>
      </header>
    </>
  );
}

function SiteFooter({ companySettings }: { companySettings: CompanySettings | null }) {
  const companyName = "Khyati Precious Gems Private Limited";
  return (
    <footer className="kg-site-footer">
      <div className="kg-footer-grid">
        <section className="kg-footer-brand">
          <a href={`${SITE}/`} aria-label="KhyatiGems home"><Image src="/brand/footer-logo-white.png" alt="KhyatiGems" width={160} height={105} /></a>
          <p className="kg-footer-tagline">{companyName}</p>
          <p>A growing reference library for gemstone names, properties, treatments and care.</p>
        </section>
        {footerGroups.map((group) => <nav key={group.title} aria-label={group.title}><h2>{group.title}</h2>{group.links.map(([label, href]) => <a key={href} href={`${SITE}${href}`}>{label}</a>)}{group.title === "KhyatiGems" && companySettings?.email && <a href={`mailto:${companySettings.email}`}>{companySettings.email}</a>}{group.title === "KhyatiGems" && companySettings?.phone && <a href={`tel:${companySettings.phone.replace(/[^+0-9]/g, "")}`}>{companySettings.phone}</a>}</nav>)}
      </div>
      <section className="kg-footer-social" aria-labelledby="kg-footer-social-heading">
        <div><h2 id="kg-footer-social-heading">Connect with KhyatiGems</h2><p>Follow our work or get in touch with our team.</p></div>
        <nav aria-label="Social media and reviews">
          <a href={whatsappEnquiry} target="_blank" rel="noopener noreferrer" aria-label="Enquire with KhyatiGems on WhatsApp" title="WhatsApp"><Image src="/social/whatsapp.svg" alt="" width={20} height={20} unoptimized /></a>
          {socialLinks.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`Visit KhyatiGems on ${social.label}`} title={social.label}><Image src={`/social/${social.path}.svg`} alt="" width={20} height={20} unoptimized /></a>)}
        </nav>
      </section>
      <div className="kg-footer-bottom"><p>© {new Date().getFullYear()} {companyName}</p><nav aria-label="Website policies"><a href={`${SITE}/privacy`}>Privacy &amp; terms</a><a href={`${SITE}/image-credits`}>Image credits</a><a href={`${SITE}/editorial-policy`}>How we review</a></nav></div>
    </footer>
  );
}

export function SkuPreviewContent({ item, companySettings, rate, totalAmount, isPerCarat, descriptionHtml, qrPaymentAmount, qrPaymentDue, qrAllowPartial, certificateUrl }: Props) {
  const [certificateDetailsOpen, setCertificateDetailsOpen] = useState(false);
  const uniqueProductMedia = useMemo(() => {
    const productMedia: GalleryMedia[] = item.media.map((media) => ({
      id: media.id, mediaType: media.type, mediaUrl: media.mediaUrl, isPrimary: media.isPrimary,
    }));
    if (item.imageUrl) productMedia.unshift({ id: "inventory-main-image", mediaType: "IMAGE", mediaUrl: item.imageUrl, isPrimary: !productMedia.some((media) => media.isPrimary) });
    if (item.videoUrl) productMedia.push({ id: "inventory-main-video", mediaType: "VIDEO", mediaUrl: item.videoUrl, isPrimary: false });
    return productMedia.filter((media, index, list) => media.mediaUrl && list.findIndex((candidate) => candidate.mediaUrl === media.mediaUrl) === index);
  }, [item.imageUrl, item.media, item.videoUrl]);
  const hasProductImage = uniqueProductMedia.some((media) => media.mediaType.toUpperCase() === "IMAGE");
  const paymentPreviewImage = uniqueProductMedia.find((media) => media.mediaType.toUpperCase() === "IMAGE")?.mediaUrl || null;
  const galleryMedia = useMemo(() => [
    ...(!hasProductImage ? [productPlaceholder] : []),
    ...uniqueProductMedia,
    ...(hasProductImage ? brandSlides.map((slide) => ({ ...slide, mediaType: "IMAGE", isPrimary: false, alt: slide.title })) : []),
  ], [hasProductImage, uniqueProductMedia]);

  const certificateNumber = item.certificateNumber || item.certificateNo;
  const certificateLab = (item as unknown as { certificateLab?: string | null }).certificateLab || item.lab;
  const hasCertificateValue = (value?: string | null) => Boolean(value?.trim() && !["none", "n/a", "-"].includes(value.trim().toLowerCase()));
  const showCertificate = Boolean(certificateUrl || hasCertificateValue(item.certification) || hasCertificateValue(certificateNumber) || hasCertificateValue(certificateLab) || item.certificates.length);
  const productEnquiryUrl = `https://wa.me/919915270295?text=${encodeURIComponent(`Hello KhyatiGems, I am interested in ${item.itemName} (${item.sku}).`)}`;
  const specs = ([
    ["Gemstone", item.gemstoneCode?.name || item.gemType || item.stoneType],
    ["Carat weight", item.carats ? `${item.carats} ct` : item.weightValue ? `${item.weightValue} ${item.weightUnit || ""}`.trim() : null],
    ["Shape", item.shape], ["Cut", item.cutCode?.name || item.cut], ["Colour", item.colorCode?.name || item.color],
    ["Clarity", item.clarityGrade || item.clarity], ["Origin", item.origin || item.originCountry], ["Treatment", item.treatment],
    ["Dimensions", item.dimensionsMm ? `${item.dimensionsMm} mm` : item.measurements], ["Polish", item.polish],
    ["Symmetry", item.symmetry], ["Fluorescence", item.fluorescence],
  ] as Array<[string, string | null | undefined]>).filter((row) => row[1] !== null && row[1] !== undefined && row[1] !== "");

  return (
    <div className="kg-product-page">
      <SiteHeader />
      <nav className="kg-breadcrumbs" aria-label="Breadcrumb"><a href={`${SITE}/`}>Home</a><span aria-hidden="true">/</span><a href={`${SITE}/gemstones`}>Gemstones</a><span aria-hidden="true">/</span><span aria-current="page">{item.sku}</span></nav>

      <main id="kg-main" className="kg-product-main">
        <section className="kg-product-layout" aria-labelledby="kg-product-title">
          <div className="kg-gallery-column"><MediaGallery key={item.sku} media={galleryMedia} itemName={item.itemName} /></div>
          <div className="kg-product-details">
            <p className="kg-eyebrow">{item.gemstoneCode?.name || item.gemType || "Natural Gemstone"}</p>
            <h1 id="kg-product-title">{item.itemName}</h1>
            <p className="kg-sku">REFERENCE: {item.sku}</p>
            <div className="kg-stock"><StatusBadge status={item.status} /></div>

            <div className="kg-price-row">
              <div><span>{isPerCarat ? "PRICE PER CARAT" : "PRICE"}</span><p>{rate ? formatCurrency(rate) : "Contact us"}{rate && isPerCarat ? <small> / ct</small> : null}</p></div>
              <div className="kg-total-price"><span>TOTAL PRICE</span><p>{totalAmount ? formatCurrency(totalAmount) : "On enquiry"}</p></div>
            </div>

            <p className="kg-introduction">A distinctive gemstone, selected with care. Review its details below or contact our team for personal assistance.</p>
            <dl className="kg-spec-grid">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>

            <div className="kg-product-actions">
              {qrPaymentAmount !== null && <InventoryQrPayButton key={`${item.sku}-${qrPaymentAmount}`} sku={item.sku} itemName={item.itemName} itemImage={paymentPreviewImage} stockStatus={item.status} maximumAmount={qrPaymentAmount} remainingBalance={qrPaymentDue} allowPartial={qrAllowPartial} />}
              <a className={`kg-button kg-enquire-button ${qrPaymentAmount !== null ? "kg-button-outline" : "kg-button-dark"}`} href={productEnquiryUrl} target="_blank" rel="noopener noreferrer" aria-label={`Chat with the Khyati Gems team about ${item.itemName}`}><MessageCircle size={17} aria-hidden="true" /><span>CHAT WITH OUR GEM TEAM</span><ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>

            {showCertificate && <section className="kg-certificate" aria-labelledby="kg-certificate-title"><h2 id="kg-certificate-title">Certification</h2><div className="kg-certificate-facts">{certificateLab && <p><span>Laboratory</span>{certificateLab}</p>}{certificateNumber && <p><span>Certificate number</span>{certificateNumber}</p>}{item.certificates.map((cert) => <p key={cert.id}><span>Certificate</span>{cert.name}{cert.remarks ? ` · ${cert.remarks}` : ""}</p>)}</div>{certificateUrl
              ? <a className="kg-button kg-button-outline kg-certificate-action" href={certificateUrl} target="_blank" rel="noopener noreferrer"><BadgeCheck size={16} aria-hidden="true" /> VIEW CERTIFICATE <ArrowUpRight size={14} aria-hidden="true" /></a>
              : <button className="kg-button kg-button-outline kg-certificate-action" type="button" onClick={() => setCertificateDetailsOpen(true)}><BadgeCheck size={16} aria-hidden="true" /> VIEW CERTIFICATE</button>}</section>}

            <p className="kg-authenticity">Verified authentic · KhyatiGems collection</p>
          </div>
        </section>

        {descriptionHtml && <section className="kg-description-section"><div className="kg-description-inner"><p className="kg-eyebrow">Product information</p><h2>About this gemstone</h2><div className="kg-product-description" dangerouslySetInnerHTML={{ __html: descriptionHtml }} /></div></section>}
      </main>

      <Dialog open={certificateDetailsOpen} onOpenChange={setCertificateDetailsOpen}>
        <DialogContent className="kg-certificate-dialog">
          <DialogHeader>
            <DialogTitle>Certificate details</DialogTitle>
            <DialogDescription>Certification information saved for this gemstone.</DialogDescription>
          </DialogHeader>
          <dl className="kg-certificate-dialog-facts">
            {certificateLab && <div><dt>Laboratory</dt><dd>{certificateLab}</dd></div>}
            {certificateNumber && <div><dt>Certificate number</dt><dd>{certificateNumber}</dd></div>}
            {hasCertificateValue(item.certification) && <div><dt>Certification record</dt><dd>{item.certification}</dd></div>}
            {item.certificates.map((cert) => <div key={cert.id}><dt>Certificate</dt><dd>{cert.name}{cert.remarks ? ` · ${cert.remarks}` : ""}</dd></div>)}
          </dl>
          <p className="kg-certificate-dialog-note">A certificate file or verification link is not attached to this record yet. Please contact our team for assistance.</p>
        </DialogContent>
      </Dialog>

      <section className="kg-support-band"><p className="kg-eyebrow">A question about this gemstone?</p><h2>Our team would be delighted to help.</h2><a href={whatsappEnquiry}>CONTACT OUR TEAM <ArrowUpRight size={16} /></a></section>
      <SiteFooter companySettings={companySettings} />
      <style jsx global>{`
        @font-face{font-family:'KG DM Sans';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/brand-font-0.ttf') format('truetype')}
        @font-face{font-family:'KG DM Sans';font-style:normal;font-weight:500;font-display:swap;src:url('/fonts/brand-font-1.ttf') format('truetype')}
        @font-face{font-family:'KG DM Sans';font-style:normal;font-weight:600;font-display:swap;src:url('/fonts/brand-font-2.ttf') format('truetype')}
        @font-face{font-family:'KG DM Sans';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/brand-font-3.ttf') format('truetype')}
        @font-face{font-family:'KG Playfair';font-style:normal;font-weight:500 700;font-display:swap;src:url('/fonts/brand-font-7.ttf') format('truetype')}
        .kg-product-page{--kg-paper:#fcfbf7;--kg-ivory:#f5f1e8;--kg-ink:#202521;--kg-footer:#202722;--kg-gold:#96733b;--kg-gold-text:#806231;--kg-line:#d9d5cb;background:var(--kg-paper);color:var(--kg-ink);font:16px/1.68 'KG DM Sans',Arial,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
        .kg-product-page *{box-sizing:border-box}.kg-product-page a{color:inherit;text-underline-offset:4px}.kg-product-page button{font:inherit}
        .kg-skip-link{position:absolute;z-index:200;left:18px;top:-90px;padding:12px 16px;background:#fff;color:var(--kg-ink)}.kg-skip-link:focus{top:12px}
        .kg-site-header{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:28px;min-height:84px;padding:0 5%;border-bottom:1px solid var(--kg-line);background:#fcfbf7f7;backdrop-filter:blur(12px)}
        .kg-brand{flex:0 0 auto}.kg-brand img{display:block;width:118px;height:64px;object-fit:contain}
        .kg-desktop-navigation{display:flex;align-items:center;justify-content:flex-end;gap:20px}.kg-desktop-navigation a{padding:10px 0;color:var(--kg-ink);font-size:10px;font-weight:500;letter-spacing:.075em;text-decoration:none;text-transform:uppercase;white-space:nowrap}.kg-desktop-navigation a:hover{color:#826235}
        .kg-mobile-navigation{display:none}.kg-mobile-navigation>summary{list-style:none}.kg-mobile-navigation>summary::-webkit-details-marker{display:none}
        .kg-breadcrumbs{display:flex;align-items:center;gap:11px;max-width:1440px;margin:0 auto;padding:23px 6%;color:#797a73;font-size:12px}.kg-breadcrumbs a{text-decoration:none}.kg-breadcrumbs a:hover{color:var(--kg-gold-text)}.kg-breadcrumbs [aria-current]{color:#33372f}
        .kg-product-main{max-width:none;margin:0 auto}.kg-product-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(390px,.95fr);align-items:start;gap:clamp(48px,7vw,112px);max-width:1440px;margin:0 auto;padding:24px 6% 92px}.kg-gallery-column{position:sticky;top:112px;min-width:0}.kg-product-details{min-width:0;padding-top:9px}.kg-eyebrow{margin:0;color:var(--kg-gold-text);font-size:10px;font-weight:700;letter-spacing:.17em;text-transform:uppercase}.kg-product-details h1{margin:13px 0 12px;color:var(--kg-ink);font:500 clamp(35px,4.2vw,58px)/1.12 'KG Playfair',Georgia,serif;letter-spacing:-.035em}.kg-sku{margin:0;color:#777a72;font-size:10px;letter-spacing:.14em}.kg-stock{display:flex;margin:24px 0 6px}.kg-stock .status-badge,.kg-stock>div{margin:0!important}
        .kg-price-row{display:flex;justify-content:space-between;align-items:flex-end;gap:22px;margin-top:18px;padding:23px 0;border-block:1px solid var(--kg-line)}.kg-price-row span{color:#777a72;font-size:9px;font-weight:700;letter-spacing:.14em}.kg-price-row p{margin:6px 0 0;color:var(--kg-ink);font:500 22px/1.2 'KG Playfair',Georgia,serif}.kg-price-row small{font:400 12px 'KG DM Sans',Arial,sans-serif;color:#777a72}.kg-total-price{text-align:right}.kg-total-price p{font-size:28px}
        .kg-introduction{max-width:600px;margin:22px 0 0;color:#5f635d;font-size:14px;line-height:1.85}.kg-spec-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;margin:26px 0 0;padding:0;border-top:1px solid var(--kg-line)}.kg-spec-grid>div{min-width:0;padding:15px 0;border-bottom:1px solid var(--kg-line)}.kg-spec-grid dt{color:#777a72;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.kg-spec-grid dd{margin:4px 0 0;color:#292d28;font-size:14px;font-weight:500;overflow-wrap:anywhere}
        .kg-product-actions{display:flex;align-items:flex-start;flex-wrap:wrap;gap:11px;margin-top:27px}.kg-button{display:inline-flex;min-height:52px;align-items:center;justify-content:center;gap:10px;padding:14px 18px;border:1px solid var(--kg-ink);border-radius:2px;font-size:10px;font-weight:700;letter-spacing:.08em;text-decoration:none;transition:background-color .18s,color .18s,transform .18s}.kg-button:hover{transform:translateY(-1px)}.kg-button-dark{background:var(--kg-ink);color:#fff!important}.kg-button-dark:hover{background:#3d443c}.kg-button-outline{background:transparent;color:var(--kg-ink)}.kg-button-outline:hover{background:#fff}.kg-enquire-button{min-height:52px;min-width:218px;gap:9px;padding:12px 16px;white-space:nowrap;font-size:9px;letter-spacing:.075em}.kg-enquire-button svg:first-child{color:#9b7442;flex:none}.kg-enquire-button span{line-height:1}.kg-certificate{margin-top:28px;padding:20px 22px;background:#f5f1e8}.kg-certificate h2{margin:0 0 12px;font:500 18px 'KG Playfair',Georgia,serif}.kg-certificate-facts{display:flex;flex-wrap:wrap;gap:8px 22px}.kg-certificate-facts p{display:grid;gap:3px;margin:0;color:#33372f;font-size:12px}.kg-certificate-facts p span{color:#777a72;font-size:9px;letter-spacing:.1em;text-transform:uppercase}.kg-certificate-action{min-height:42px;margin-top:15px;padding:10px 14px}.kg-authenticity{margin:28px 0 0;color:#777a72;font-size:10px;letter-spacing:.11em;text-align:center;text-transform:uppercase}
        .kg-description-section{padding:72px 6%;border-block:1px solid var(--kg-line);background:var(--kg-ivory)}
        .kg-description-inner{max-width:1160px;margin:0 auto}
        .kg-description-inner h2{margin:10px 0 0;color:var(--kg-ink);font:500 clamp(29px,3vw,42px)/1.2 'KG Playfair',Georgia,serif}
        .kg-product-description{max-width:1040px;margin:25px auto 0;padding:clamp(22px,3.5vw,42px);border:1px solid var(--kg-line);border-radius:4px;background:#fff;color:#555c55;font-size:14px;line-height:1.8;overflow-wrap:anywhere;box-shadow:0 10px 32px #2025210a}
        .kg-product-description>div{margin:0}
        .kg-product-description img{display:block;width:auto;max-width:100%;max-height:360px;height:auto;margin:18px auto;object-fit:contain;border-radius:3px}
        .kg-product-description img[alt^="KhyatiGems banner" i]{width:100%;max-width:100%;max-height:none;height:auto;margin:26px 0;object-fit:contain;border-radius:5px}
        .kg-product-description img[alt*="logo" i],.kg-product-description img[title*="logo" i],.kg-product-description img[src*="KhyatiGems_icon-color" i]{width:72px!important;max-width:72px!important;max-height:72px!important;margin:0 auto 8px;object-fit:contain}
        .kg-product-description table{display:none}
        .kg-product-description h1,.kg-product-description h2,.kg-product-description h3,.kg-product-description h4{margin:22px 0 8px;color:var(--kg-ink);font-family:'KG Playfair',Georgia,serif;font-weight:500;line-height:1.3}
        .kg-product-description h1{font-size:23px}.kg-product-description h2{font-size:20px}.kg-product-description h3{padding-bottom:9px;border-bottom:1px solid #e8e4dc;font-size:18px}.kg-product-description h4{font-size:15px}
        .kg-product-description a{color:var(--kg-gold-text);text-decoration:underline;text-underline-offset:3px}
        .kg-product-description p{margin:9px 0}.kg-product-description ul,.kg-product-description ol{margin:10px 0;padding-left:22px}.kg-product-description li{margin:5px 0;padding-left:3px}.kg-product-description *{max-width:100%}
        .kg-certificate-dialog{max-width:36rem}.kg-certificate-dialog-facts{display:grid;gap:12px;margin:10px 0 0}.kg-certificate-dialog-facts>div{display:grid;gap:3px;padding-bottom:10px;border-bottom:1px solid #e6e2d9}.kg-certificate-dialog-facts dt{color:#777a72;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.kg-certificate-dialog-facts dd{margin:0;color:#202521;font-size:14px;overflow-wrap:anywhere}.kg-certificate-dialog-note{margin:3px 0 0;color:#666b64;font-size:12px;line-height:1.6}
        .kg-support-band{padding:56px 20px 62px;background:var(--kg-ivory);text-align:center}.kg-support-band h2{margin:11px 0 20px;color:var(--kg-ink);font:500 clamp(25px,3vw,38px)/1.25 'KG Playfair',Georgia,serif}.kg-support-band>a{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:15px 22px;background:var(--kg-ink);color:#fff;font-size:10px;font-weight:700;letter-spacing:.09em;text-decoration:none}.kg-support-band>a:hover{background:#3d443c}
        .kg-site-footer{display:block;max-width:none;margin:0;padding:70px 6% 0;background:var(--kg-footer);color:#e5e8e2}.kg-footer-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1.2fr;gap:45px;max-width:1440px;margin:0 auto;padding-bottom:45px}.kg-footer-brand img{display:block;width:155px;height:auto;max-height:112px;object-fit:contain;object-position:left center}.kg-footer-tagline{margin:20px 0 18px;color:#e7d5b1;font:500 23px/1.35 'KG Playfair',Georgia,serif}.kg-footer-brand>p:last-child{max-width:32ch;margin:0;color:#c3c8c0;font-size:13px;line-height:1.7}.kg-footer-grid nav{display:flex;flex-direction:column;align-items:flex-start;gap:10px}.kg-footer-grid nav h2{margin:0 0 12px;color:#e5d5b1;font:700 10px 'KG DM Sans',Arial,sans-serif;letter-spacing:.13em;text-transform:uppercase}.kg-footer-grid nav a,.kg-site-footer a{color:#d9ddd6;font-size:12px;text-decoration:none}.kg-footer-grid nav a:hover,.kg-site-footer a:hover{color:#e1c58c;text-decoration:underline}.kg-footer-social{display:flex;align-items:center;justify-content:space-between;gap:24px;max-width:1440px;margin:0 auto;padding:24px 0 30px;border-top:1px solid #4a5147}.kg-footer-social h2{margin:0 0 5px;color:#e5d5b1;font:600 13px/1.4 'KG DM Sans',Arial,sans-serif}.kg-footer-social p{margin:0;color:#bdc5b8;font-size:12px}.kg-footer-social nav{display:flex;align-items:center;gap:10px}.kg-footer-social nav a{display:grid;width:42px;height:42px;place-items:center;border:1px solid #596158;border-radius:50%;background:#29312b;transition:transform .16s,background-color .16s,border-color .16s}.kg-footer-social nav a:hover{transform:translateY(-2px);border-color:#e7d5b1;background:#343b34}.kg-footer-social nav img{display:block;width:19px;height:19px}.kg-footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:20px;max-width:1440px;margin:0 auto;padding:22px 0;border-top:1px solid #4a5147}.kg-footer-bottom p{margin:0;color:#bdc5b8;font-size:11px}.kg-footer-bottom nav{display:flex;flex-wrap:wrap;gap:24px}.kg-footer-bottom nav a{font-size:11px}
        @media(max-width:1200px){.kg-site-header{padding-inline:4%}.kg-desktop-navigation{gap:13px}.kg-desktop-navigation a{font-size:9px}.kg-product-layout{gap:48px;padding-inline:5%}.kg-footer-grid{gap:30px}}
        @media(max-width:1050px){.kg-desktop-navigation{display:none}.kg-mobile-navigation{position:relative;display:block;z-index:101;margin-left:auto}.kg-mobile-navigation>summary{display:flex;min-height:46px;align-items:center;justify-content:center;gap:10px;padding:0 4px 0 14px;color:var(--kg-ink);background:none;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}.kg-menu-icon{display:grid;width:38px;height:38px;align-content:center;justify-items:center;gap:4px;border:1px solid var(--kg-line);background:#fffefa}.kg-menu-icon i{width:14px;height:1px;background:var(--kg-ink);transition:transform .18s,opacity .18s}.kg-mobile-navigation[open] .kg-menu-icon i:first-child{transform:translateY(5px) rotate(45deg)}.kg-mobile-navigation[open] .kg-menu-icon i:nth-child(2){opacity:0}.kg-mobile-navigation[open] .kg-menu-icon i:last-child{transform:translateY(-5px) rotate(-45deg)}.kg-mobile-navigation-panel{position:fixed;top:84px;left:0;width:100vw;max-height:calc(100dvh - 84px);overflow-y:auto;overscroll-behavior:contain;padding:32px clamp(24px,7vw,96px) max(24px,env(safe-area-inset-bottom));border-block:1px solid var(--kg-line);background:var(--kg-paper);box-shadow:0 18px 36px #2027221c}.kg-mobile-navigation-heading{max-width:560px;margin:0 auto 26px;padding-bottom:20px;border-bottom:1px solid var(--kg-line)}.kg-mobile-navigation-heading>span{color:#826235;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.kg-mobile-navigation-heading p{margin:7px 0 0;font:500 clamp(20px,3vw,26px)/1.25 'KG Playfair',Georgia,serif}.kg-mobile-navigation-panel nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px clamp(28px,6vw,88px);max-width:920px;margin:0 auto}.kg-mobile-navigation-panel nav section{display:flex;min-width:0;flex-direction:column}.kg-mobile-navigation-panel nav h2{margin:0 0 8px;color:#676d65;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.kg-mobile-navigation-panel nav a{display:flex;min-height:47px;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e6e4dc;font-size:14px;font-weight:500;text-decoration:none}.kg-mobile-navigation-panel nav a::after{content:'→';color:#826235;font-size:16px}.kg-mobile-navigation-ask{display:flex;max-width:920px;min-height:66px;align-items:center;justify-content:space-between;gap:20px;margin:30px auto 0;padding:14px 18px;background:#f0ece2;font-size:13px;text-decoration:none}.kg-mobile-navigation-ask strong{color:#72552c}.kg-product-layout{grid-template-columns:minmax(0,1fr) minmax(340px,.95fr);gap:36px}.kg-footer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:700px){.kg-site-header{height:76px;min-height:76px;padding:8px 6%;gap:16px}.kg-brand img{width:105px;height:58px}.kg-mobile-navigation-panel{top:76px;max-height:calc(100dvh - 76px);padding:24px 6% max(20px,env(safe-area-inset-bottom))}.kg-mobile-navigation-panel nav{grid-template-columns:1fr;gap:24px}.kg-mobile-navigation-heading{margin-bottom:22px;padding-bottom:17px}.kg-mobile-navigation-ask{align-items:flex-start;flex-direction:column;gap:6px;margin-top:24px}.kg-breadcrumbs{padding:18px 6%;font-size:11px}.kg-product-layout{display:flex;flex-direction:column;gap:32px;padding:10px 6% 60px}.kg-gallery-column{position:static;width:100%}.kg-product-details{width:100%;padding-top:0}.kg-product-details h1{font-size:clamp(34px,9vw,49px)}.kg-price-row p{font-size:19px}.kg-total-price p{font-size:24px}.kg-spec-grid{gap:0 15px}.kg-spec-grid>div{padding:12px 0}.kg-spec-grid dd{font-size:13px}.kg-product-actions{flex-direction:column}.kg-button{width:100%}.kg-description-section{padding:42px 6%}.kg-product-description{padding:20px 18px;font-size:12.5px;line-height:1.62}.kg-product-description h1{font-size:20px}.kg-product-description h2{font-size:18px}.kg-product-description h3{font-size:16px}.kg-product-description img{max-height:240px;margin:12px auto}.kg-product-description img[alt*="logo" i],.kg-product-description img[title*="logo" i],.kg-product-description img[src*="KhyatiGems_icon-color" i]{width:64px!important;max-width:64px!important;max-height:64px!important}.kg-gallery-lightbox{width:calc(100vw - 20px)!important;padding:12px!important}.kg-gallery-lightbox-stage{height:78dvh;min-height:220px}.kg-footer-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 20px}.kg-footer-brand{grid-column:1/-1}.kg-site-footer{padding:52px 6% 0}.kg-footer-social{align-items:flex-start;flex-direction:column;gap:16px}.kg-footer-social nav{flex-wrap:wrap;gap:8px}.kg-footer-social nav a{width:38px;height:38px}.kg-footer-bottom{align-items:flex-start;flex-direction:column}.kg-footer-bottom nav{gap:16px}}
        @media(max-width:430px){.kg-mobile-navigation-panel nav{gap:20px}.kg-spec-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.kg-footer-grid{gap:28px 14px}.kg-footer-brand img{width:130px}}
        @media(prefers-reduced-motion:reduce){.kg-product-page *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
      `}</style>
    </div>
  );
}
