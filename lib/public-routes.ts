/** Only customer-facing page shapes belong here; never match /invoices. */
export function isPublicPage(pathname: string) {
  return pathname === "/login" || pathname === "/work-tracker-extension-privacy" ||
    pathname === "/downloads/work-tracker-extension.zip" || pathname === "/manifest.webmanifest" ||
    /^\/(?:verify|V|invoice)\/[^/]+\/?$/.test(pathname) ||
    (/^\/preview\/[^/]+\/?$/.test(pathname) && pathname !== "/preview/label" && pathname !== "/preview/label/");
}
