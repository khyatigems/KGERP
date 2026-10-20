const ebay = ["ebay.com", "ebay.co.uk", "ebay.de", "ebay.fr", "ebay.it", "ebay.es", "ebay.ca", "ebay.com.au", "ebay.in"];
const amazon = ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.ca", "amazon.com.au", "amazon.co.jp", "amazon.ae"];
export function classifyDomain(host, erpHost = "erp.khyatigems.com") {
  if (host === erpHost) return "ERP";
  if (["etsy.com", "www.etsy.com", "sell.etsy.com"].includes(host)) return "ETSY";
  if (ebay.some(d => [d, `www.${d}`, `sellerhub.${d}`].includes(host))) return "EBAY";
  if (amazon.some(d => [d, `www.${d}`, `sellercentral.${d}`].includes(host))) return "AMAZON";
  return null;
}
export function eligibleTab(tab, focused, idle, erpHost) {
  if (!focused || idle !== "active" || !tab?.url) return null;
  try { const url = new URL(tab.url); if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null; const platform = classifyDomain(url.hostname, erpHost); return platform ? { platform, domain: url.hostname } : null; } catch { return null; }
}
