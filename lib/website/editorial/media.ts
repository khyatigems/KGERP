/** Resize/compress delivery without changing gemstone colour or adding effects. */
export function deliveryUrl(value: string, width: number) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/image/upload/")
    ) {
      url.pathname = url.pathname.replace(
        "/image/upload/",
        `/image/upload/f_auto,q_auto,c_limit,w_${Math.max(160, Math.min(1600, Math.round(width)))}/`,
      );
      return url.href;
    }
  } catch {
    /* A pending asset may have no URL. */
  }
  return value;
}
